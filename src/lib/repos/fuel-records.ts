import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";
import type { FuelRecord, FuelType } from "@/types/database";

const mapFuelRecord = (row: Record<string, unknown>): FuelRecord => ({
    id: row.id as string,
    vehicleId: row.vehicleId as string,
    companyId: row.companyId as string,
    employeeId: (row.employeeId as string) ?? null,
    fecha: row.fecha as Date,
    litros: Number(row.litros),
    kilometraje: row.kilometraje ? Number(row.kilometraje) : null,
    tipoCombustible: row.tipoCombustible as FuelType,
    costoTotal: row.costoTotal ? Number(row.costoTotal) : null,
    precioLitro: row.precioLitro ? Number(row.precioLitro) : null,
    estacion: (row.estacion as string) ?? null,
    observaciones: (row.observaciones as string) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
});

export const listFuelRecordsByCompany = async (
    companyId: string,
    options?: { limit?: number; offset?: number; fromDate?: Date; toDate?: Date }
) => {
    let query = 'SELECT fr.*, v."patente", e."nombreCompleto" as "employeeName" FROM "FuelRecord" fr LEFT JOIN "Vehicle" v ON v."id" = fr."vehicleId" LEFT JOIN "Employee" e ON e."id" = fr."employeeId" WHERE fr."companyId" = $1';
    const params: unknown[] = [companyId];
    let paramIndex = 2;

    if (options?.fromDate) {
        query += ` AND fr."fecha" >= $${paramIndex++}`;
        params.push(options.fromDate);
    }
    if (options?.toDate) {
        query += ` AND fr."fecha" <= $${paramIndex++}`;
        params.push(options.toDate);
    }

    query += ' ORDER BY fr."fecha" DESC';

    if (options?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(options.limit);
    }
    if (options?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
    }

    const rows = await runQuery<Record<string, unknown>>(query, params);
    return rows.map((row) => ({
        ...mapFuelRecord(row),
        patente: row.patente as string,
        employeeName: (row.employeeName as string) ?? null,
    }));
};

export const listFuelRecordsByVehicle = async (vehicleId: string) => {
    const rows = await runQuery<Record<string, unknown>>(
        'SELECT fr.*, e."nombreCompleto" as "employeeName" FROM "FuelRecord" fr LEFT JOIN "Employee" e ON e."id" = fr."employeeId" WHERE fr."vehicleId" = $1 ORDER BY fr."fecha" DESC',
        [vehicleId],
    );
    return rows.map((row) => ({
        ...mapFuelRecord(row),
        employeeName: (row.employeeName as string) ?? null,
    }));
};

export const getFuelRecordById = async (id: string) => {
    const row = await runSingle<Record<string, unknown>>(
        'SELECT * FROM "FuelRecord" WHERE "id" = $1',
        [id],
    );
    return row ? mapFuelRecord(row) : null;
};

export const createFuelRecord = async (data: {
    vehicleId: string;
    companyId: string;
    employeeId?: string | null;
    fecha: Date;
    litros: number;
    kilometraje?: number | null;
    tipoCombustible: FuelType;
    costoTotal?: number | null;
    precioLitro?: number | null;
    estacion?: string | null;
    observaciones?: string | null;
}) => {
    const id = crypto.randomUUID();
    const row = await runSingle<Record<string, unknown>>(
        'INSERT INTO "FuelRecord" ("id","vehicleId","companyId","employeeId","fecha","litros","kilometraje","tipoCombustible","costoTotal","precioLitro","estacion","observaciones","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *',
        [
            id,
            data.vehicleId,
            data.companyId,
            data.employeeId ?? null,
            data.fecha,
            data.litros,
            data.kilometraje ?? null,
            data.tipoCombustible,
            data.costoTotal ?? null,
            data.precioLitro ?? null,
            data.estacion ?? null,
            data.observaciones ?? null,
        ],
    );
    return row ? mapFuelRecord(row) : null;
};

export const updateFuelRecord = async (
    id: string,
    data: Partial<Omit<FuelRecord, "id" | "vehicleId" | "companyId" | "createdAt" | "updatedAt">>,
) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        fields.push(`"${key}" = $${index++}`);
        values.push(value);
    }
    if (!fields.length) return getFuelRecordById(id);
    values.push(id);
    const row = await runSingle<Record<string, unknown>>(
        `UPDATE "FuelRecord" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${fields.length + 1} RETURNING *`,
        values,
    );
    return row ? mapFuelRecord(row) : null;
};

export const deleteFuelRecord = async (id: string) => {
    await runSingle('DELETE FROM "FuelRecord" WHERE "id" = $1', [id]);
};

// Estadísticas de combustible
export const getFuelStatsByVehicle = async (vehicleId: string, year?: number, month?: number) => {
    let query = 'SELECT SUM("litros") as "totalLitros", SUM("costoTotal") as "totalCosto", COUNT(*) as "totalCargas", MAX("kilometraje") - MIN("kilometraje") as "kmRecorridos" FROM "FuelRecord" WHERE "vehicleId" = $1';
    const params: unknown[] = [vehicleId];
    let paramIndex = 2;

    if (year) {
        query += ` AND EXTRACT(YEAR FROM "fecha") = $${paramIndex++}`;
        params.push(year);
    }
    if (month) {
        query += ` AND EXTRACT(MONTH FROM "fecha") = $${paramIndex}`;
        params.push(month);
    }

    const row = await runSingle<Record<string, unknown>>(query, params);
    if (!row) return null;

    return {
        totalLitros: Number(row.totalLitros ?? 0),
        totalCosto: Number(row.totalCosto ?? 0),
        totalCargas: Number(row.totalCargas ?? 0),
        kmRecorridos: Number(row.kmRecorridos ?? 0),
    };
};
