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

export type WorkerDayStatus = {
  id: string;
  workedMs: number;
  runningSince: string | null;
  lastAction?: string;
  lastTime?: string;
  marks: Partial<
    Record<"entrada" | "inicio_almuerzo" | "fin_almuerzo" | "salida", string>
  >;
};

export type RecentMark = {
  id: string;
  employeeName: string;
  action: string;
  timestamp: string;
};

export const listTodayStatusesForCompany = async (
  companyId: string,
  date: Date,
) => {
  const rows = await runQuery<Record<string, unknown>>(
    `SELECT
        e."id",
        COALESCE(
          (CASE
             WHEN tr."horaInicioAlmuerzo" IS NOT NULL AND tr."horaEntrada" IS NOT NULL
             THEN EXTRACT(EPOCH FROM tr."horaInicioAlmuerzo" - tr."horaEntrada")
             ELSE 0
           END) +
          (CASE
             WHEN tr."horaSalida" IS NOT NULL AND tr."horaFinAlmuerzo" IS NOT NULL
             THEN EXTRACT(EPOCH FROM tr."horaSalida" - tr."horaFinAlmuerzo")
             ELSE 0
           END),
          0
        ) * 1000 AS "workedMs",
        CASE
          WHEN tr."horaFinAlmuerzo" IS NOT NULL AND tr."horaSalida" IS NULL THEN tr."horaFinAlmuerzo"
          WHEN tr."horaEntrada" IS NOT NULL AND tr."horaInicioAlmuerzo" IS NULL THEN tr."horaEntrada"
          ELSE NULL
        END AS "runningSince",
        CASE
          WHEN tr."horaSalida" IS NOT NULL THEN 'Salida'
          WHEN tr."horaFinAlmuerzo" IS NOT NULL THEN 'Fin almuerzo'
          WHEN tr."horaInicioAlmuerzo" IS NOT NULL THEN 'Inicio almuerzo'
          WHEN tr."horaEntrada" IS NOT NULL THEN 'Entrada'
          ELSE NULL
        END AS "lastAction",
        COALESCE(
          tr."horaSalida",
          tr."horaFinAlmuerzo",
          tr."horaInicioAlmuerzo",
          tr."horaEntrada"
        ) AS "lastTime",
        tr."horaEntrada",
        tr."horaInicioAlmuerzo",
        tr."horaFinAlmuerzo",
        tr."horaSalida"
      FROM "Employee" e
      LEFT JOIN "TimeRecord" tr
        ON tr."employeeId" = e."id"
       AND DATE(tr."fecha") = DATE($2)
      WHERE e."companyId" = $1
        AND e."isActive" = true
      ORDER BY e."nombreCompleto" ASC`,
    [companyId, date],
  );

  return rows.map((row) => ({
    id: row.id as string,
    workedMs: Number(row.workedMs ?? 0),
    runningSince: row.runningSince
      ? new Date(row.runningSince as string).toISOString()
      : null,
    lastAction: (row.lastAction as string) ?? undefined,
    lastTime: row.lastTime
      ? new Date(row.lastTime as string).toISOString()
      : undefined,
    marks: {
      entrada: row.horaEntrada
        ? new Date(row.horaEntrada as string).toISOString()
        : undefined,
      inicio_almuerzo: row.horaInicioAlmuerzo
        ? new Date(row.horaInicioAlmuerzo as string).toISOString()
        : undefined,
      fin_almuerzo: row.horaFinAlmuerzo
        ? new Date(row.horaFinAlmuerzo as string).toISOString()
        : undefined,
      salida: row.horaSalida
        ? new Date(row.horaSalida as string).toISOString()
        : undefined,
    },
  })) as WorkerDayStatus[];
};

const resolveLastAction = (row: Record<string, unknown>) => {
  if (row.horaSalida) {
    return { action: "Salida", timestamp: new Date(row.horaSalida as string) };
  }
  if (row.horaFinAlmuerzo) {
    return {
      action: "Fin almuerzo",
      timestamp: new Date(row.horaFinAlmuerzo as string),
    };
  }
  if (row.horaInicioAlmuerzo) {
    return {
      action: "Inicio almuerzo",
      timestamp: new Date(row.horaInicioAlmuerzo as string),
    };
  }
  if (row.horaEntrada) {
    return {
      action: "Entrada",
      timestamp: new Date(row.horaEntrada as string),
    };
  }
  return row.updatedAt
    ? {
        action: "Marcación",
        timestamp: new Date(row.updatedAt as string),
      }
    : null;
};

export const listRecentMarksByCompany = async (
  companyId: string,
  limit = 12,
): Promise<RecentMark[]> => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT tr."id", tr."horaEntrada", tr."horaInicioAlmuerzo", tr."horaFinAlmuerzo", tr."horaSalida", tr."updatedAt", e."nombreCompleto" FROM "TimeRecord" tr JOIN "Employee" e ON e."id" = tr."employeeId" WHERE tr."companyId" = $1 ORDER BY tr."updatedAt" DESC LIMIT $2',
    [companyId, limit],
  );
  return rows
    .map((row) => {
      const last = resolveLastAction(row);
      if (!last) {
        return null;
      }
      return {
        id: row.id as string,
        employeeName: row.nombreCompleto as string,
        action: last.action,
        timestamp: last.timestamp.toISOString(),
      };
    })
    .filter(Boolean) as RecentMark[];
};
