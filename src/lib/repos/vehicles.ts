import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";
import type { Vehicle, FuelType } from "@/types/database";

const mapVehicle = (row: Record<string, unknown>): Vehicle => ({
    id: row.id as string,
    companyId: row.companyId as string,
    patente: row.patente as string,
    marca: (row.marca as string) ?? null,
    modelo: (row.modelo as string) ?? null,
    anio: row.anio ? Number(row.anio) : null,
    tipoCombustible: row.tipoCombustible as FuelType,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
});

export const listVehiclesByCompany = async (companyId: string) => {
    const rows = await runQuery<Record<string, unknown>>(
        'SELECT * FROM "Vehicle" WHERE "companyId" = $1 ORDER BY "patente" ASC',
        [companyId],
    );
    return rows.map(mapVehicle);
};

export const listActiveVehiclesByCompany = async (companyId: string) => {
    const rows = await runQuery<Record<string, unknown>>(
        'SELECT * FROM "Vehicle" WHERE "companyId" = $1 AND "isActive" = true ORDER BY "patente" ASC',
        [companyId],
    );
    return rows.map(mapVehicle);
};

export const getVehicleById = async (id: string) => {
    const row = await runSingle<Record<string, unknown>>(
        'SELECT * FROM "Vehicle" WHERE "id" = $1',
        [id],
    );
    return row ? mapVehicle(row) : null;
};

export const getVehicleByPatente = async (companyId: string, patente: string) => {
    const row = await runSingle<Record<string, unknown>>(
        'SELECT * FROM "Vehicle" WHERE "companyId" = $1 AND "patente" = $2',
        [companyId, patente.toUpperCase()],
    );
    return row ? mapVehicle(row) : null;
};

export const createVehicle = async (data: {
    companyId: string;
    patente: string;
    marca?: string | null;
    modelo?: string | null;
    anio?: number | null;
    tipoCombustible?: FuelType;
}) => {
    const id = crypto.randomUUID();
    const row = await runSingle<Record<string, unknown>>(
        'INSERT INTO "Vehicle" ("id","companyId","patente","marca","modelo","anio","tipoCombustible","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) RETURNING *',
        [
            id,
            data.companyId,
            data.patente.toUpperCase(),
            data.marca ?? null,
            data.modelo ?? null,
            data.anio ?? null,
            data.tipoCombustible ?? "bencina_95",
        ],
    );
    return row ? mapVehicle(row) : null;
};

export const updateVehicle = async (
    id: string,
    data: Partial<Omit<Vehicle, "id" | "companyId" | "createdAt" | "updatedAt">>,
) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        if (key === "patente") {
            fields.push(`"${key}" = $${index++}`);
            values.push((value as string).toUpperCase());
        } else {
            fields.push(`"${key}" = $${index++}`);
            values.push(value);
        }
    }
    if (!fields.length) return getVehicleById(id);
    values.push(id);
    const row = await runSingle<Record<string, unknown>>(
        `UPDATE "Vehicle" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${fields.length + 1} RETURNING *`,
        values,
    );
    return row ? mapVehicle(row) : null;
};

export const deleteVehicle = async (id: string) => {
    await runSingle(
        'UPDATE "Vehicle" SET "isActive" = false, "updatedAt" = NOW() WHERE "id" = $1',
        [id],
    );
};
