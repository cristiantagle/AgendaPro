import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import { upsertManualAttendance } from "@/lib/repos/time-records";
import { getEmployeeById } from "@/lib/repos/employees";

const manualAttendanceSchema = z.object({
    employeeId: z.string().uuid(),
    fecha: z.string().transform((val) => new Date(val)),
    tipoJornada: z.enum([
        "completa",
        "media",
        "permiso_con_goce",
        "permiso_sin_goce",
        "vacaciones",
        "licencia_medica",
        "falta",
    ]),
    horaEntrada: z.string().transform((val) => new Date(val)).optional(),
    horaSalida: z.string().transform((val) => new Date(val)).optional(),
    notas: z.string().optional(),
});

export async function POST(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    try {
        const payload = await request.json();
        const data = manualAttendanceSchema.parse(payload);

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
        });

        return NextResponse.json({ record });
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
