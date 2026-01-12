import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { assertRole, getSession } from "@/lib/auth";
import { runQuery } from "@/lib/db";
import { nowInTimezone } from "@/lib/datetime";
import { CHILE_TIMEZONE } from "@/lib/timezone";

type TipoJornada = "completa" | "media" | "permiso_con_goce" | "permiso_sin_goce" | "vacaciones" | "licencia_medica" | "falta" | "feriado";

export async function GET() {
    try {
        const session = await getSession();
        assertRole(session, ["company_admin", "superadmin"]);

        const companyId = session.companyId;
        if (!companyId && session.role !== "superadmin") {
            return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
        }

        const now = nowInTimezone();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const todayDay = now.getDate();

        // Obtener todos los empleados activos
        const employees = await runQuery<{ id: string; nombreCompleto: string }>(
            `SELECT id, "nombreCompleto" FROM "Employee" WHERE "companyId" = $1 AND "isActive" = true`,
            [companyId]
        );

        const totalEmployees = employees.length;
        if (totalEmployees === 0) {
            return NextResponse.json({
                asistenciaPorcentaje: 0,
                diasTrabajados: 0,
                diasHabiles: 0,
                topFaltas: [],
                tendenciaSemanal: [],
                alertas: []
            });
        }

        // Obtener registros del mes
        const records = await runQuery<{
            employeeId: string;
            fecha: string;
            tipoJornada: TipoJornada;
        }>(
            `SELECT "employeeId", "fecha", "tipoJornada" 
             FROM "TimeRecord" 
             WHERE "companyId" = $1 AND "fecha" >= $2 AND "fecha" <= $3`,
            [companyId, monthStart, monthEnd]
        );

        // Calcular días trabajados (tipos que cuentan como asistencia)
        const tiposPresentismo: TipoJornada[] = ["completa", "media", "permiso_con_goce", "feriado", "licencia_medica"];
        const diasTrabajados = records.filter(r => tiposPresentismo.includes(r.tipoJornada)).length;
        const diasHabiles = totalEmployees * todayDay; // días hábiles esperados hasta hoy
        const asistenciaPorcentaje = diasHabiles > 0 ? Math.round((diasTrabajados / diasHabiles) * 100) : 0;

        // Top 5 trabajadores con más faltas
        const faltasPorEmpleado: Record<string, number> = {};
        records.forEach(r => {
            if (r.tipoJornada === "falta" || r.tipoJornada === "permiso_sin_goce") {
                faltasPorEmpleado[r.employeeId] = (faltasPorEmpleado[r.employeeId] || 0) + 1;
            }
        });

        const topFaltas = Object.entries(faltasPorEmpleado)
            .map(([id, count]) => ({
                id,
                nombre: employees.find(e => e.id === id)?.nombreCompleto || "Desconocido",
                faltas: count
            }))
            .sort((a, b) => b.faltas - a.faltas)
            .slice(0, 5);

        // Tendencia semanal (últimos 7 días)
        const tendenciaSemanal: { dia: string; asistencia: number; faltas: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const fecha = subDays(now, i);
            const fechaStr = formatInTimeZone(fecha, CHILE_TIMEZONE, "yyyy-MM-dd");
            const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
            const isoDay = Number(formatInTimeZone(fecha, CHILE_TIMEZONE, "i"));
            const diaLabel = diasSemana[isoDay % 7];

            const recordsDia = records.filter(
                r =>
                    formatInTimeZone(new Date(r.fecha), CHILE_TIMEZONE, "yyyy-MM-dd") === fechaStr
            );
            const asistencia = recordsDia.filter(r => tiposPresentismo.includes(r.tipoJornada)).length;
            const faltas = recordsDia.filter(r => r.tipoJornada === "falta").length;

            tendenciaSemanal.push({ dia: diaLabel, asistencia, faltas });
        }

        // Alertas de ausentismo (empleados con 3+ faltas)
        const alertas = Object.entries(faltasPorEmpleado)
            .filter(([, count]) => count >= 3)
            .map(([id, count]) => ({
                empleadoId: id,
                nombre: employees.find(e => e.id === id)?.nombreCompleto || "Desconocido",
                mensaje: `${count} faltas este mes`,
                tipo: count >= 5 ? "critico" : "advertencia"
            }));

        return NextResponse.json({
            asistenciaPorcentaje,
            diasTrabajados,
            diasHabiles,
            totalEmpleados: totalEmployees,
            topFaltas,
            tendenciaSemanal,
            alertas
        });

    } catch (error) {
        console.error("Error en KPIs:", error);
        return NextResponse.json({ error: "Error al obtener KPIs" }, { status: 500 });
    }
}
