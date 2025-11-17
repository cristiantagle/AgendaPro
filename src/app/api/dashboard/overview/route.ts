import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth } from "date-fns";

import { getSession } from "@/lib/auth";
import { startOfDayUtc } from "@/lib/datetime";
import { runQuery, runSingle } from "@/lib/db";
import { getCompanyById } from "@/lib/repos/companies";
import { getEmployeeByUserId } from "@/lib/repos/employees";
import { findTimeRecord } from "@/lib/repos/time-records";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.role === "superadmin") {
    const companies = await runQuery<{
      id: string;
      name: string;
      rut: string | null;
      emailContacto: string | null;
      telefonoContacto: string | null;
      isActive: boolean;
      createdAt: Date;
      employeesCount: number;
    }>(
      'SELECT c.*, (SELECT COUNT(*) FROM "Employee" e WHERE e."companyId" = c."id") AS "employeesCount" FROM "Company" c ORDER BY c."createdAt" DESC',
    );

    const totals = companies.reduce(
      (acc, company) => {
        acc.empresas += 1;
        acc.trabajadores += Number(company.employeesCount);
        acc.activos += company.isActive ? 1 : 0;
        return acc;
      },
      { empresas: 0, trabajadores: 0, activos: 0 },
    );

    return NextResponse.json({
      role: "superadmin",
      companies,
      totals,
    });
  }

  if (session.role === "company_admin") {
    const company = await getCompanyById(session.companyId!);
    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 },
      );
    }

    const employeesCount = await runSingle<{ count: string }>(
      'SELECT COUNT(*) as count FROM "Employee" WHERE "companyId" = $1',
      [company.id],
    );

    const start = startOfMonth(new Date());
    const end = endOfMonth(start);

    const monthRecords = await runSingle<{ count: string }>(
      'SELECT COUNT(*) as count FROM "TimeRecord" WHERE "companyId" = $1 AND "fecha" BETWEEN $2 AND $3',
      [company.id, start, end],
    );

    return NextResponse.json({
      role: "company_admin",
      company: {
        ...company,
        _count: { employees: Number(employeesCount?.count ?? "0") },
      },
      metrics: {
        totalRegistrosMes: Number(monthRecords?.count ?? "0"),
      },
    });
  }

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) {
    return NextResponse.json(
      { error: "Perfil no encontrado" },
      { status: 404 },
    );
  }

  const company = await getCompanyById(employee.companyId);
  if (!company) {
    return NextResponse.json(
      { error: "Perfil no encontrado" },
      { status: 404 },
    );
  }

  const todayUtc = startOfDayUtc(new Date());
  const record = await findTimeRecord({
    employeeId: employee.id,
    fecha: todayUtc,
  });

  return NextResponse.json({
    role: "worker",
    employee: { ...employee, company },
    todayRecord: record,
  });
}
