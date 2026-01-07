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

const DEDUCTIBLE_PAYMENT_TYPES = ["adelanto", "quincena"];

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

  const payments = await runQuery(
    `SELECT "amount","type","note","paidAt" FROM "Payment"
     WHERE "employeeId" = $1
       AND "paidAt" BETWEEN $2 AND $3
       AND "type" = ANY($4::text[])`,
    [employee.id, start, end, DEDUCTIBLE_PAYMENT_TYPES],
  );

  const totalAdelantos = payments.reduce(
    (acc, payment) => acc + Number(payment.amount ?? 0),
    0,
  );

  const paymentDetails = payments.map((payment) => ({
    amount: Number(payment.amount ?? 0),
    type: String(payment.type ?? ""),
    note: (payment.note as string) ?? null,
    fecha: new Date(payment.paidAt as Date).toISOString().split("T")[0],
  }));

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
      tipoJornada: row.tipoJornada ?? "completa",
    })),
    employee,
    {
      ...companyData.company,
      schedules,
    },
    companyData.paySettings,
    month,
    year,
    totalAdelantos,
    paymentDetails,
  );
};

// ============================================
// NUEVO: Reporte Cotizaciones (Lista unificada)
// ============================================
export interface PayrollReportRow {
  rut: string | null;
  nombreCompleto: string;
  diasTrabajados: number;
  diasHabiles: number;
  diasFalta: number;
  mesCompleto: boolean;
  afp: string | null;
  salud: string | null;
  isActive: boolean;
}

export interface PayrollReport {
  companyName: string;
  companyRut: string | null;
  month: number;
  year: number;
  generatedAt: string;
  employees: PayrollReportRow[];
  totalEmpleados: number;
  diasHabilesMes: number;
}

/**
 * Calcula días hábiles (lunes a viernes) en un mes
 */
const calcularDiasHabiles = (year: number, month: number): number => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // Excluir sábado y domingo
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const getPayrollReportForCompany = async (
  companyId: string,
  month: number,
  year: number,
  employeeIds?: string[], // Opcional: filtrar por trabajadores específicos
): Promise<PayrollReport> => {
  // Obtener empresa
  const companyData = await getCompanyWithSettings(companyId);
  if (!companyData) {
    throw new Error("Empresa no encontrada");
  }

  // Calcular días hábiles del mes
  const diasHabilesMes = calcularDiasHabiles(year, month);

  // Obtener empleados (filtrados si se especifican IDs)
  let employeeQuery = 'SELECT id, "nombreCompleto", rut, "afp", "salud", "isActive" FROM "Employee" WHERE "companyId" = $1';
  const params: (string | string[])[] = [companyId];

  if (employeeIds && employeeIds.length > 0) {
    employeeQuery += ' AND id = ANY($2::text[])';
    params.push(employeeIds);
  }

  employeeQuery += ' ORDER BY "nombreCompleto"';

  const employees = await runQuery(employeeQuery, params);

  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);

  // Obtener todos los registros del mes (fecha formateada y tipoJornada)
  // Usamos TO_CHAR para asegurar formato YYYY-MM-DD y evitar problemas de zona horaria
  const records = await runQuery(
    `SELECT "employeeId", TO_CHAR("fecha", 'YYYY-MM-DD') as "fechaStr", "tipoJornada"
     FROM "TimeRecord" 
     WHERE "companyId" = $1 
       AND "fecha" >= $2 
       AND "fecha" <= $3`,
    [companyId, start, end],
  );

  // Mapa de registros por empleado y fecha
  // Clave: employeeId_YYYY-MM-DD
  const recordMap = new Map<string, string>();
  for (const row of records) {
    const dateStr = row.fechaStr as string;
    const key = `${row.employeeId}_${dateStr}`;
    recordMap.set(key, (row.tipoJornada as string) || "completa");
  }



  const result: PayrollReportRow[] = [];

  // Tipos de jornada que cuentan como "Falta" (descuentan día)
  const ABSENCE_TYPES = ["falta", "permiso_sin_goce"];

  for (const emp of employees) {
    let diasFalta = 0;
    let diasTrabajados = 0;

    // Iterar día por día del mes
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Construir fecha string local YYYY-MM-DD para consultar el mapa
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const key = `${emp.id}_${dateStr}`;
        const tipoJornada = recordMap.get(key);

        if (!tipoJornada) {
          diasFalta++;
        } else if (ABSENCE_TYPES.includes(tipoJornada)) {
          diasFalta++;
        } else {
          diasTrabajados++;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    result.push({
      rut: emp.rut as string | null,
      nombreCompleto: emp.nombreCompleto as string,
      diasTrabajados,
      diasHabiles: diasHabilesMes,
      diasFalta: diasFalta,
      mesCompleto: diasFalta === 0,
      afp: (emp.afp as string) || null,
      salud: (emp.salud as string) || null,
      isActive: emp.isActive as boolean,
    });
  }

  return {
    companyName: companyData.company.name,
    companyRut: companyData.company.rut,
    month,
    year,
    generatedAt: new Date().toISOString(),
    employees: result,
    totalEmpleados: result.length,
    diasHabilesMes,
  };
};

