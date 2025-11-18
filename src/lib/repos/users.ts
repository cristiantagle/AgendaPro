import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";
import type { Role } from "@/types/database";

export type DbUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  companyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const mapUser = (row: Record<string, unknown>): DbUser => ({
  id: row.id as string,
  email: row.email as string,
  passwordHash: row.passwordHash as string,
  role: row.role as Role,
  companyId: row.companyId as string | null,
  createdAt: new Date(row.createdAt as string),
  updatedAt: new Date(row.updatedAt as string),
});

export const getUserByEmail = async (email: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "User" WHERE "email" = $1',
    [email],
  );
  return row ? mapUser(row) : null;
};

export const getUserById = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "User" WHERE "id" = $1',
    [id],
  );
  return row ? mapUser(row) : null;
};

export const createUser = async (data: {
  id?: string;
  email: string;
  passwordHash: string;
  role: Role;
  companyId?: string | null;
}) => {
  const id = data.id ?? crypto.randomUUID();
  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "User" ("id","email","passwordHash","role","companyId","createdAt","updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
    [id, data.email, data.passwordHash, data.role, data.companyId ?? null],
  );
  return row ? mapUser(row) : null;
};

export const updateUser = async (
  id: string,
  data: Partial<Pick<DbUser, "role" | "companyId" | "passwordHash">>,
) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (data.role) {
    fields.push(`"role" = $${index++}`);
    values.push(data.role);
  }
  if (data.companyId !== undefined) {
    fields.push(`"companyId" = $${index++}`);
    values.push(data.companyId);
  }
  if (data.passwordHash) {
    fields.push(`"passwordHash" = $${index++}`);
    values.push(data.passwordHash);
  }

  if (!fields.length) {
    return getUserById(id);
  }

  values.push(id);

  const row = await runSingle<Record<string, unknown>>(
    `UPDATE "User" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${
      fields.length + 1
    } RETURNING *`,
    values,
  );
  return row ? mapUser(row) : null;
};

export const listAdminsByCompany = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT * FROM "User" WHERE "companyId" = $1 AND "role" = $2',
    [companyId, "company_admin"],
  );
  return rows.map(mapUser);
};
