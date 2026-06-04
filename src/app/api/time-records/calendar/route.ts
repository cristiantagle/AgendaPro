import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { getMonthlyCalendar } from "@/lib/repos/time-records";
import { getEmployeeById } from "@/lib/repos/employees";

export async function GET(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!employeeId || !year || !month) {
        return NextResponse.json(
            { error: "Faltan parámetros: employeeId, year, month" },
            { status: 400 }
        );
    }

    // Verificar que el empleado pertenece a la empresa
    const employee = await getEmployeeById(employeeId);
    if (!employee || employee.companyId !== session.companyId) {
        return NextResponse.json(
            { error: "Empleado no encontrado" },
            { status: 404 }
        );
    }

    if (!employee.isActive) {
        return NextResponse.json(
            { error: "El trabajador está inactivo" },
            { status: 409 }
        );
    }

    const calendar = await getMonthlyCalendar(
        employeeId,
        parseInt(year),
        parseInt(month)
    );

    return NextResponse.json({ calendar, employee });
}
