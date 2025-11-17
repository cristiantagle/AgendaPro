import { endOfMonth, startOfMonth } from "date-fns";

import type { SessionPayload } from "./auth";
import { runQuery } from "./db";
import {
  getCompanyWithSettings,
  listSchedules,
} from "./repos/companies";
import { getEmployeeById } from "./repos/employees";
import { buildMonthlySummary } from "./time-calculations";
import type { Role } from "@/types/database";

export const getMonthlySummaryForEmployee = async (
  employeeId: string,
  month: number,
  year: number,
  session: SessionPayload | null,
) => {
  if (!session) {
    throw new Error("No autorizado");
  }

  const employee = await getEmployeeById(employeeId);
  if (!employee) {
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

  const companyData = await getCompanyWithSettings(employee.companyId);
  if (!companyData || !companyData.paySettings) {
    const error = new Error("Empresa sin configuración de pago");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const schedules = await listSchedules(employee.companyId);

  const records = await runQuery(
    'SELECT * FROM "TimeRecord" WHERE "employeeId" = $1 AND "fecha" BETWEEN $2 AND $3 ORDER BY "fecha" ASC',
    [employee.id, start, end],
  );

  return buildMonthlySummary(
    records.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      companyId: row.companyId,
      fecha: new Date(row.fecha),
      horaEntrada: row.horaEntrada ? new Date(row.horaEntrada) : null,
      horaInicioAlmuerzo: row.horaInicioAlmuerzo
        ? new Date(row.horaInicioAlmuerzo)
        : null,
      horaFinAlmuerzo: row.horaFinAlmuerzo
        ? new Date(row.horaFinAlmuerzo)
        : null,
      horaSalida: row.horaSalida ? new Date(row.horaSalida) : null,
      esManual: row.esManual,
      notas: row.notas,
    })),
    employee,
    {
      ...companyData.company,
      schedules,
    },
    companyData.paySettings,
    month,
    year,
  );
};
