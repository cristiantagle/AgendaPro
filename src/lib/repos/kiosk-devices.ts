import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";

export type KioskDevice = {
  id: string;
  companyId: string;
  name: string | null;
  token: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

const mapDevice = (row: Record<string, unknown>): KioskDevice => ({
  id: row.id as string,
  companyId: row.companyId as string,
  name: (row.name as string) ?? null,
  token: row.token as string,
  createdAt: new Date(row.createdAt as string),
  lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt as string) : null,
});

export const listDevices = async (companyId: string) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT * FROM "KioskDevice" WHERE "companyId" = $1 ORDER BY "createdAt" DESC',
    [companyId],
  );
  return rows.map(mapDevice);
};

export const getDeviceByToken = async (token: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "KioskDevice" WHERE "token" = $1',
    [token],
  );
  return row ? mapDevice(row) : null;
};

export const getDeviceById = async (id: string) => {
  const row = await runSingle<Record<string, unknown>>(
    'SELECT * FROM "KioskDevice" WHERE "id" = $1',
    [id],
  );
  return row ? mapDevice(row) : null;
};

export const createDevice = async (data: {
  companyId: string;
  name?: string | null;
  token?: string;
}) => {
  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "KioskDevice" ("id","companyId","name","token","createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *',
    [
      crypto.randomUUID(),
      data.companyId,
      data.name ?? null,
      data.token ?? crypto.randomUUID(),
    ],
  );
  return row ? mapDevice(row) : null;
};

export const updateDevice = async (
  id: string,
  data: Partial<Pick<KioskDevice, "name" | "lastUsedAt" | "token">>,
) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`"${key}" = $${index++}`);
    values.push(value);
  }
  if (!fields.length) {
    return getDeviceById(id);
  }
  values.push(id);
  const row = await runSingle<Record<string, unknown>>(
    `UPDATE "KioskDevice" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${
      fields.length + 1
    } RETURNING *`,
    values,
  );
  return row ? mapDevice(row) : null;
};

export const deleteDevice = async (id: string) => {
  await runQuery('DELETE FROM "KioskDevice" WHERE "id" = $1', [id]);
};
