import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { fromZonedTime } from "date-fns-tz";

import { assertRole, getSession } from "@/lib/auth";
import { upsertManualAttendance } from "@/lib/repos/time-records";
import { getEmployeeById } from "@/lib/repos/employees";
import { CHILE_TIMEZONE } from "@/lib/timezone";

const parseDateLabel = (label: string) =>
    fromZonedTime(`${label}T00:00:00`, CHILE_TIMEZONE);

// Schema for single date
const singleDateSchema = z.object({
    employeeId: z.string().uuid(),
    fecha: z.string().transform(parseDateLabel),
    tipoJornada: z.enum([
        "completa",
        "media",
        "permiso_con_goce",
        "permiso_sin_goce",
        "vacaciones",
        "licencia_medica",
        "falta",
        "feriado",
    ]),
    horaEntrada: z.string().transform((val) => new Date(val)).optional(),
    horaSalida: z.string().transform((val) => new Date(val)).optional(),
    notas: z.string().optional(),
    horasExtra: z.number().min(0).optional(),
});

// Schema for bulk dates
const bulkDateSchema = z.object({
    employeeId: z.string().uuid(),
    fechas: z.array(z.string()).min(1),
    tipoJornada: z.enum([
        "completa",
        "media",
        "permiso_con_goce",
        "permiso_sin_goce",
        "vacaciones",
        "licencia_medica",
        "falta",
        "feriado",
    ]),
    notas: z.string().optional(),
    horasExtra: z.number().min(0).optional(),
});

export async function POST(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    try {
        const payload = await request.json();

        // Check if bulk mode (has fechas array) or single mode (has fecha string)
        const isBulk = Array.isArray(payload.fechas);

        if (isBulk) {
            // Bulk mode: create/update multiple records
            const data = bulkDateSchema.parse(payload);

            // Verificar que el empleado pertenece a la empresa
            const employee = await getEmployeeById(data.employeeId);
            if (!employee || employee.companyId !== session.companyId) {
                return NextResponse.json(
                    { error: "Empleado no encontrado" },
                    { status: 404 }
                );
            }

            const results = [];
            for (const fechaStr of data.fechas) {
                const fecha = parseDateLabel(fechaStr);
                const record = await upsertManualAttendance({
                    employeeId: data.employeeId,
                    companyId: session.companyId!,
                    fecha,
                    tipoJornada: data.tipoJornada,
                    notas: data.notas,
                    horasExtra: data.horasExtra,
                });
                results.push(record);
            }

            return NextResponse.json({ records: results, count: results.length });
        } else {
            // Single mode: create/update one record
            const data = singleDateSchema.parse(payload);

            // Verificar que el empleado pertenece a la empresa
            const employee = await getEmployeeById(data.employeeId);
            if (!employee || employee.companyId !== session.companyId) {
                return NextResponse.json(
                    { error: "Empleado no encontrado" },
                    { status: 404 }
                );
            }

            const record = await upsertManualAttendance({
                employeeId: data.employeeId,
                companyId: session.companyId!,
                fecha: data.fecha,
                tipoJornada: data.tipoJornada,
                horaEntrada: data.horaEntrada,
                horaSalida: data.horaSalida,
                notas: data.notas,
                horasExtra: data.horasExtra,
            });

            return NextResponse.json({ record });
        }
    } catch (error) {
        if (error instanceof ZodError) {
            const message =
                error.issues[0]?.message ??
                "Revisa los datos ingresados e inténtalo nuevamente.";
            return NextResponse.json({ error: message }, { status: 400 });
        }
        throw error;
    }
}
