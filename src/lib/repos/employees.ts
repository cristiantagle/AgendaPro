import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";
import type {
  Company,
  CompanyPaySetting,
  CompanyWorkSchedule,
  Employee,
  Role,
} from "@/types/database";

const mapEmployee = (row: Record<string, unknown>): Employee => ({
  id: row.id as string,
  companyId: row.companyId as string,
  userId: row.userId as string,
  nombreCompleto: row.nombreCompleto as string,
  rut: (row.rut as string) ?? null,
  valorHoraBase: row.valorHoraBase ? Number(row.valorHoraBase) : null,
  sueldoMensual: row.sueldoMensual ? Number(row.sueldoMensual) : null,
  isActive: Boolean(row.isActive),
});

const mapCompany = (row: Record<string, unknown>): Company => ({
  id: row.id as string,
  name: row.name as string,
  rut: (row.rut as string) ?? null,
  emailContacto: (row.emailContacto as string) ?? null,
  telefonoContacto: (row.telefonoContacto as string) ?? null,
  isActive: Boolean(row.isActive),
  logoUrl: (row.logoUrl as string) ?? null,
  kioskSlug: row.kioskSlug as string,
  kioskPin: row.kioskPin as string,
});

const mapPaySettings = (
  row: Record<string, unknown>,
): CompanyPaySetting => ({
  id: row.id as string,
  companyId: row.companyId as string,
  valorHoraBaseGlobal: Number(row.valorHoraBaseGlobal),
  sueldoMensualBase: Number(row.sueldoMensualBase),
  factorExtraSemana: Number(row.factorExtraSemana),
  weekendDayRate: Number(row.weekendDayRate),
  weekendExtraHourRate: Number(row.weekendExtraHourRate),
});

const mapSchedule = (
  row: Record<string, unknown>,
): CompanyWorkSchedule => ({
  id: row.id as string,
  companyId: row.companyId as string,
  diaSemana: Number(row.diaSemana),
  horaInicio: row.horaInicio as string,
  horaFin: row.horaFin as string,
  tipo: row.tipo as CompanyWorkSchedule["tipo"],
});

export const getEmployeeById = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "Employee" WHERE "id" = $1',
    [id],
  );
  return row ? mapEmployee(row) : null;
};

export const getEmployeeWithUser = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT e.*, u."email" FROM "Employee" e JOIN "User" u ON u."id" = e."userId" WHERE e."id" = $1',
    [id],
  );
  if (!row) return null;
  return {
    ...mapEmployee(row),
    user: { email: row.email as string },
  };
};

export const getEmployeeWithUserAndCompany = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT e.*, u."email" as "userEmail", u."role" as "userRole", c."id" as "companyIdRef", c."name" as "companyName" FROM "Employee" e JOIN "User" u ON u."id" = e."userId" JOIN "Company" c ON c."id" = e."companyId" WHERE e."id" = $1',
    [id],
  );
  if (!row) return null;
  return {
    employee: mapEmployee(row),
    user: {
      id: row.userId as string,
      email: row.userEmail as string,
      role: row.userRole as Role,
    },
    company: {
      id: row.companyIdRef as string,
      name: row.companyName as string,
    },
  };
};

export const getEmployeeByUserId = async (userId: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "Employee" WHERE "userId" = $1',
    [userId],
  );
  return row ? mapEmployee(row) : null;
};

export const getEmployeeWithCompany = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT e.*, c."name" as "companyName", c."rut" as "companyRut", c."emailContacto" as "companyEmail", c."telefonoContacto" as "companyPhone", c."isActive" as "companyActive", c."logoUrl" as "companyLogo", c."kioskSlug", c."kioskPin" FROM "Employee" e JOIN "Company" c ON c."id" = e."companyId" WHERE e."id" = $1',
    [id],
  );
  if (!row) return null;
  const employee = mapEmployee(row);
  const company: Company = {
    id: employee.companyId,
    name: row.companyName as string,
    rut: (row.companyRut as string) ?? null,
    emailContacto: (row.companyEmail as string) ?? null,
    telefonoContacto: (row.companyPhone as string) ?? null,
    isActive: Boolean(row.companyActive),
    logoUrl: (row.companyLogo as string) ?? null,
    kioskSlug: row.kioskSlug as string,
    kioskPin: row.kioskPin as string,
  };
  return { employee, company };
};

export const getEmployeeCompanyWithSchedules = async (id: string) => {
  const base = await getEmployeeWithCompany(id);
  if (!base) return null;
  const schedules = await getCompanySchedules(base.company.id);
  return { ...base, schedules };
};

export const getCompanySchedules = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT * FROM "CompanyWorkSchedule" WHERE "companyId" = $1 ORDER BY "diaSemana" ASC',
    [companyId],
  );
  return rows.map(mapSchedule);
};

export const listEmployeesByCompany = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT e.*, u."email" FROM "Employee" e JOIN "User" u ON u."id" = e."userId" WHERE e."companyId" = $1 ORDER BY e."createdAt" DESC',
    [companyId],
  );
  return rows.map((row) => ({
    ...mapEmployee(row),
    user: { email: row.email as string },
  }));
};

export const listActiveEmployeesForCompany = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT e."id", e."nombreCompleto", u."role" FROM "Employee" e JOIN "User" u ON u."id" = e."userId" WHERE e."companyId" = $1 AND e."isActive" = true ORDER BY e."nombreCompleto" ASC',
    [companyId],
  );
  return rows.map((row) => ({
    id: row.id as string,
    nombreCompleto: row.nombreCompleto as string,
    role: row.role as Role,
  }));
};

export const createEmployee = async (data: {
  id?: string;
  companyId: string;
  userId: string;
  nombreCompleto: string;
  rut?: string | null;
  valorHoraBase?: number | null;
  sueldoMensual?: number | null;
}) => {
  const id = data.id ?? crypto.randomUUID();
  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "Employee" ("id","companyId","userId","nombreCompleto","rut","valorHoraBase","sueldoMensual","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) RETURNING *',
    [
      id,
      data.companyId,
      data.userId,
      data.nombreCompleto,
      data.rut ?? null,
      data.valorHoraBase ?? null,
      data.sueldoMensual ?? null,
    ],
  );
  return row ? mapEmployee(row) : null;
};

export const updateEmployee = async (
  id: string,
  data: Partial<{
    nombreCompleto: string;
    rut: string | null;
    sueldoMensual: number | null;
    valorHoraBase: number | null;
    isActive: boolean;
  }>,
) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;
  for (const key of Object.keys(data) as Array<keyof typeof data>) {
    fields.push(`"${key}" = $${index++}`);
    values.push(data[key]);
  }
  if (!fields.length) {
    return getEmployeeById(id);
  }
  values.push(id);
  const row = await runSingle<Record<string, unknown>>(
    `UPDATE "Employee" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${
      fields.length + 1
    } RETURNING *`,
    values,
  );
  return row ? mapEmployee(row) : null;
};

export const getCompanyWithSettings = async (companyId: string) => {
  const companyRow = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "Company" WHERE "id" = $1',
    [companyId],
  );
  if (!companyRow) return null;
  const payRow = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "CompanyPaySetting" WHERE "companyId" = $1',
    [companyId],
  );
  return {
    company: mapCompany(companyRow),
    paySettings: payRow ? mapPaySettings(payRow) : null,
  };
};
