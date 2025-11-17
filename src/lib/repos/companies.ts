import crypto from "node:crypto";

import { runQuery, runSingle, withTransaction } from "@/lib/db";
import { generateKioskPin, generateKioskSlug } from "@/lib/kiosk";
import type {
  Company,
  CompanyPaySetting,
  CompanyWorkSchedule,
} from "@/types/database";

const mapCompany = (row: Record<string, unknown>): Company => ({
  id: row.id as string,
  name: row.name as string,
  rut: (row.rut as string) ?? null,
  emailContacto: (row.emailContacto as string) ?? null,
  telefonoContacto: (row.telefonoContacto as string) ?? null,
  isActive: Boolean(row.isActive),
  logoUrl: (row.logoUrl as string) ?? null,
  timezone: (row.timezone as string) ?? null,
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

export const getCompanyById = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "Company" WHERE "id" = $1',
    [id],
  );
  return row ? mapCompany(row) : null;
};

export const getCompanyBySlug = async (slug: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "Company" WHERE "kioskSlug" = $1',
    [slug],
  );
  return row ? mapCompany(row) : null;
};

export const listCompanies = async () => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT * FROM "Company" ORDER BY "createdAt" DESC',
  );
  return rows.map(mapCompany);
};

export const listCompaniesWithCounts = async () => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT c.*, (SELECT COUNT(*) FROM "Employee" e WHERE e."companyId" = c."id") AS "employeesCount" FROM "Company" c ORDER BY c."createdAt" DESC',
  );
  return rows.map((row) => ({
    ...mapCompany(row),
    employeesCount: Number(row.employeesCount ?? 0),
  }));
};

export const listCompanyAdmins = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT "id","email" FROM "User" WHERE "companyId" = $1 AND "role" = $2',
    [companyId, "company_admin"],
  );
  return rows.map((row) => ({
    id: row.id as string,
    email: row.email as string,
  }));
};

export const listCompaniesWithEmployees = async () => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT c.*, e."id" as "employeeId", e."nombreCompleto", e."rut" as "employeeRut", e."isActive" as "employeeActive", u."email" as "userEmail", u."role" as "userRole" FROM "Company" c LEFT JOIN "Employee" e ON e."companyId" = c."id" LEFT JOIN "User" u ON u."id" = e."userId" ORDER BY c."createdAt" DESC, e."nombreCompleto" ASC',
  );

  const map = new Map<string, { company: Company; employees: Array<{ id: string; nombreCompleto: string; rut: string | null; isActive: boolean; user?: { email: string; role: string } }> }>();

  rows.forEach((row) => {
    const companyId = row.id as string;
    if (!map.has(companyId)) {
      map.set(companyId, { company: mapCompany(row), employees: [] });
    }
    if (row.employeeId) {
      map.get(companyId)!.employees.push({
        id: row.employeeId as string,
        nombreCompleto: row.nombreCompleto as string,
        rut: (row.employeeRut as string) ?? null,
        isActive: Boolean(row.employeeActive),
        user: {
          email: row.userEmail as string,
          role: row.userRole as string,
        },
      });
    }
  });

  return Array.from(map.values()).map((entry) => ({
    ...entry.company,
    employees: entry.employees,
  }));
};

export const updateCompany = async (
  id: string,
  data: Partial<Company>,
) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`"${key}" = $${index++}`);
    values.push(value);
  }
  if (!fields.length) return getCompanyById(id);
  values.push(id);
  const row = await runSingle<Record<string, unknown>>(
    `UPDATE "Company" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${
      fields.length + 1
    } RETURNING *`,
    values,
  );
  return row ? mapCompany(row) : null;
};

export const getCompanyPaySettings = async (companyId: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "CompanyPaySetting" WHERE "companyId" = $1',
    [companyId],
  );
  return row ? mapPaySettings(row) : null;
};

export const upsertCompanyPaySettings = async (
  companyId: string,
  data: Omit<
    CompanyPaySetting,
    "id" | "companyId" | "createdAt" | "updatedAt"
  >,
) => {
  const existing = await getCompanyPaySettings(companyId);
  if (existing) {
    const row = await runSingle<Record<string, unknown>>(
      'UPDATE "CompanyPaySetting" SET "valorHoraBaseGlobal" = $1, "sueldoMensualBase" = $2, "factorExtraSemana" = $3, "weekendDayRate" = $4, "weekendExtraHourRate" = $5, "updatedAt" = NOW() WHERE "companyId" = $6 RETURNING *',
      [
        data.valorHoraBaseGlobal,
        data.sueldoMensualBase,
        data.factorExtraSemana,
        data.weekendDayRate,
        data.weekendExtraHourRate,
        companyId,
      ],
    );
    return row ? mapPaySettings(row) : null;
  }

  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "CompanyPaySetting" ("id","companyId","valorHoraBaseGlobal","sueldoMensualBase","factorExtraSemana","weekendDayRate","weekendExtraHourRate","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING *',
    [
      crypto.randomUUID(),
      companyId,
      data.valorHoraBaseGlobal,
      data.sueldoMensualBase,
      data.factorExtraSemana,
      data.weekendDayRate,
      data.weekendExtraHourRate,
    ],
  );
  return row ? mapPaySettings(row) : null;
};

export const listSchedules = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT * FROM "CompanyWorkSchedule" WHERE "companyId" = $1 ORDER BY "diaSemana" ASC',
    [companyId],
  );
  return rows.map(mapSchedule);
};

export const replaceSchedules = async (
  companyId: string,
  schedules: Array<{
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    tipo: CompanyWorkSchedule["tipo"];
  }>,
) => {
  await withTransaction(async (client) => {
    await client.query(
      'DELETE FROM "CompanyWorkSchedule" WHERE "companyId" = $1',
      [companyId],
    );
    const inserts = schedules.map(
      (_, index) =>
        `($${index * 4 + 1}, $${index * 4 + 2}, $${
          index * 4 + 3
        }, $${index * 4 + 4})`,
    );
    const values: unknown[] = [];
    schedules.forEach((schedule) => {
      values.push(
        companyId,
        schedule.diaSemana,
        schedule.horaInicio,
        schedule.horaFin,
        schedule.tipo,
      );
    });
    await client.query(
      `INSERT INTO "CompanyWorkSchedule" ("companyId","diaSemana","horaInicio","horaFin","tipo") VALUES ${inserts.join(", ")}`,
      values,
    );
  });
};

const defaultSchedules = [
  { diaSemana: 1, horaInicio: "08:00", horaFin: "18:00", tipo: "normal" },
  { diaSemana: 2, horaInicio: "08:00", horaFin: "18:00", tipo: "normal" },
  { diaSemana: 3, horaInicio: "08:00", horaFin: "18:00", tipo: "normal" },
  { diaSemana: 4, horaInicio: "08:00", horaFin: "18:00", tipo: "normal" },
  { diaSemana: 5, horaInicio: "08:00", horaFin: "17:00", tipo: "viernes" },
  { diaSemana: 6, horaInicio: "08:00", horaFin: "18:00", tipo: "finde" },
  { diaSemana: 0, horaInicio: "08:00", horaFin: "18:00", tipo: "finde" },
] as const;

export const createCompany = async (data: {
  name: string;
  rut?: string | null;
  emailContacto?: string | null;
  telefonoContacto?: string | null;
}) => {
  const id = crypto.randomUUID();
  const slug = generateKioskSlug(data.name);
  const pin = generateKioskPin();

  await withTransaction(async (client) => {
    await client.query(
      'INSERT INTO "Company" ("id","name","rut","emailContacto","telefonoContacto","isActive","kioskSlug","kioskPin","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,true,$6,$7,NOW(),NOW())',
      [
        id,
        data.name,
        data.rut ?? null,
        data.emailContacto ?? null,
        data.telefonoContacto ?? null,
        slug,
        pin,
      ],
    );

    await client.query(
      'INSERT INTO "CompanyPaySetting" ("id","companyId","valorHoraBaseGlobal","sueldoMensualBase","factorExtraSemana","weekendDayRate","weekendExtraHourRate","createdAt","updatedAt") VALUES ($1,$2,4500,500000,1.5,60000,8000,NOW(),NOW())',
      [crypto.randomUUID(), id],
    );

    const values: unknown[] = [];
    const inserts = defaultSchedules.map((schedule, index) => {
      values.push(
        crypto.randomUUID(),
        id,
        schedule.diaSemana,
        schedule.horaInicio,
        schedule.horaFin,
        schedule.tipo,
        new Date(),
        new Date(),
      );
      const base = index * 8;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    });

    await client.query(
      `INSERT INTO "CompanyWorkSchedule" ("id","companyId","diaSemana","horaInicio","horaFin","tipo","createdAt","updatedAt") VALUES ${inserts.join(", ")}`,
      values,
    );
  });

  return getCompanyById(id);
};
