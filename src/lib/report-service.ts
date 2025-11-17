import { endOfMonth, startOfMonth } from "date-fns";
import type { Role } from "@prisma/client";

import type { SessionPayload } from "./auth";
import { prisma } from "./prisma";
import { buildMonthlySummary } from "./time-calculations";

export const getMonthlySummaryForEmployee = async (
  employeeId: string,
  month: number,
  year: number,
  session: SessionPayload | null,
) => {
  if (!session) {
    throw new Error("No autorizado");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      company: {
        include: { paySettings: true, schedules: true },
      },
    },
  });

  if (!employee || !employee.company || !employee.company.paySettings) {
    const error = new Error("Empleado o empresa no encontrada");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const validateAccess = (role: Role) => {
    if (role === "worker" && employee.userId !== session.userId) {
      const error = new Error("No autorizado");
      (error as Error & { status?: number }).status = 403;
      throw error;
    }

    if (
      role === "company_admin" &&
      employee.companyId !== session.companyId
    ) {
      const error = new Error("No autorizado");
      (error as Error & { status?: number }).status = 403;
      throw error;
    }
  };

  validateAccess(session.role);

  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);

  const records = await prisma.timeRecord.findMany({
    where: {
      employeeId: employee.id,
      fecha: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { fecha: "asc" },
  });

  return buildMonthlySummary(
    records,
    employee,
    employee.company,
    employee.company.paySettings,
    month,
    year,
  );
};
