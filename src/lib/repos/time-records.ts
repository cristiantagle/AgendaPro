import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";
import type { TimeRecord } from "@/types/database";

const mapTimeRecord = (row: Record<string, unknown>): TimeRecord => ({
  id: row.id as string,
  employeeId: row.employeeId as string,
  companyId: row.companyId as string,
  fecha: new Date(row.fecha as string),
  horaEntrada: row.horaEntrada ? new Date(row.horaEntrada as string) : null,
  horaInicioAlmuerzo: row.horaInicioAlmuerzo
    ? new Date(row.horaInicioAlmuerzo as string)
    : null,
  horaFinAlmuerzo: row.horaFinAlmuerzo
    ? new Date(row.horaFinAlmuerzo as string)
    : null,
  horaSalida: row.horaSalida ? new Date(row.horaSalida as string) : null,
  esManual: Boolean(row.esManual),
  notas: (row.notas as string) ?? null,
});

export const findTimeRecord = async (where: {
  employeeId: string;
  fecha: Date;
}) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "TimeRecord" WHERE "employeeId" = $1 AND "fecha" = $2',
    [where.employeeId, where.fecha],
  );
  return row ? mapTimeRecord(row) : null;
};

export const createTimeRecord = async (data: {
  employeeId: string;
  companyId: string;
  fecha: Date;
  esManual?: boolean;
}) => {
  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "TimeRecord" ("id","employeeId","companyId","fecha","esManual","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING *',
    [
      crypto.randomUUID(),
      data.employeeId,
      data.companyId,
      data.fecha,
      data.esManual ?? false,
    ],
  );
  return row ? mapTimeRecord(row) : null;
};

export const updateTimeRecord = async (
  id: string,
  data: Partial<Omit<TimeRecord, "id">>,
) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;
  for (const key of Object.keys(data) as Array<keyof typeof data>) {
    const value = data[key];
    fields.push(`"${key}" = $${index++}`);
    values.push(value);
  }
  if (!fields.length) {
    return runSingle(
      'SELECT * FROM "TimeRecord" WHERE "id" = $1',
      [id],
    ).then((row) => (row ? mapTimeRecord(row) : null));
  }
  values.push(id);
  const row = await runSingle<Record<string, unknown>>(
    `UPDATE "TimeRecord" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${
      fields.length + 1
    } RETURNING *`,
    values,
  );
  return row ? mapTimeRecord(row) : null;
};

export const getTimeRecordById = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "TimeRecord" WHERE "id" = $1',
    [id],
  );
  return row ? mapTimeRecord(row) : null;
};

export const listTimeRecords = async (options: {
  where: Record<string, unknown>;
  order?: { field: string; direction: "asc" | "desc" };
}) => {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  for (const [key, value] of Object.entries(options.where)) {
    if (typeof value === "object" && value && "gte" in value && "lte" in value) {
      clauses.push(`"${key}" BETWEEN $${index} AND $${index + 1}`);
      values.push((value as { gte: Date }).gte, (value as { lte: Date }).lte);
      index += 2;
    } else {
      clauses.push(`"${key}" = $${index++}`);
      values.push(value);
    }
  }

  const sql = [
    'SELECT tr.*, e."nombreCompleto" AS "employeeName"',
    'FROM "TimeRecord" tr',
    'JOIN "Employee" e ON e."id" = tr."employeeId"',
    clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    options.order
      ? `ORDER BY "${options.order.field}" ${options.order.direction.toUpperCase()}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rows = await runQuery<Record<string, unknown>>(sql, values);
  return rows.map((row) => ({
    ...mapTimeRecord(row),
    employee: { nombreCompleto: row.employeeName as string },
  }));
};

export const listRecentRecordsByCompany = async (
  companyId: string,
  limit = 15,
) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT tr.*, e."nombreCompleto" FROM "TimeRecord" tr JOIN "Employee" e ON e."id" = tr."employeeId" WHERE tr."companyId" = $1 ORDER BY tr."fecha" DESC LIMIT $2',
    [companyId, limit],
  );
  return rows.map((row) => ({
    ...mapTimeRecord(row),
    employee: { nombreCompleto: row.nombreCompleto as string },
  }));
};

export const getTodayRecordForEmployee = async (
  employeeId: string,
  companyId: string,
  date: Date,
) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "TimeRecord" WHERE "employeeId" = $1 AND "companyId" = $2 AND DATE("fecha") = DATE($3)',
    [employeeId, companyId, date],
  );
  return row ? mapTimeRecord(row) : null;
};
