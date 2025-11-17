import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth } from "date-fns";

import { getSession } from "@/lib/auth";
import { startOfDayUtc } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.role === "superadmin") {
    const companies = await prisma.company.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totals = companies.reduce(
      (acc, company) => {
        acc.empresas += 1;
        acc.trabajadores += company._count.employees;
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
    const company = await prisma.company.findUnique({
      where: { id: session.companyId! },
      include: {
        _count: { select: { employees: true } },
      },
    });

    const start = startOfMonth(new Date());
    const end = endOfMonth(start);

    const monthRecords = await prisma.timeRecord.count({
      where: {
        companyId: session.companyId!,
        fecha: { gte: start, lte: end },
      },
    });

    return NextResponse.json({
      role: "company_admin",
      company,
      metrics: {
        totalRegistrosMes: monthRecords,
      },
    });
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: session.userId },
    include: { company: true },
  });

  if (!employee || !employee.company) {
    return NextResponse.json(
      { error: "Perfil no encontrado" },
      { status: 404 },
    );
  }

  const todayUtc = startOfDayUtc(new Date());

  const record = await prisma.timeRecord.findFirst({
    where: {
      employeeId: employee.id,
      fecha: todayUtc,
    },
  });

  return NextResponse.json({
    role: "worker",
    employee,
    todayRecord: record,
  });
}
