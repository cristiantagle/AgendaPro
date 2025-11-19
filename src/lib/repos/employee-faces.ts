import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";

export type EmployeeFace = {
  id: string;
  employeeId: string;
  descriptor: number[];
  createdAt: Date;
  updatedAt: Date;
};

const parseDescriptor = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => Number(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapFace = (row: Record<string, unknown>): EmployeeFace => ({
  id: row.id as string,
  employeeId: row.employeeId as string,
  descriptor: parseDescriptor(row.descriptor),
  createdAt: new Date(row.createdAt as string),
  updatedAt: new Date(row.updatedAt as string),
});

export const getFaceByEmployeeId = async (employeeId: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "EmployeeFace" WHERE "employeeId" = $1',
    [employeeId],
  );
  return row ? mapFace(row) : null;
};

export const upsertEmployeeFace = async (
  employeeId: string,
  descriptor: number[],
) => {
  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "EmployeeFace" ("id","employeeId","descriptor","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT ("employeeId") DO UPDATE SET "descriptor" = EXCLUDED."descriptor", "updatedAt" = NOW() RETURNING *',
    [crypto.randomUUID(), employeeId, JSON.stringify(descriptor)],
  );
  return row ? mapFace(row) : null;
};

export const listFacesByCompany = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT ef.* FROM "EmployeeFace" ef JOIN "Employee" e ON e."id" = ef."employeeId" WHERE e."companyId" = $1 AND e."isActive" = true',
    [companyId],
  );
  return rows.map(mapFace);
};
