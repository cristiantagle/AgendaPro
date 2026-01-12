import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";

import { withTransaction } from "@/lib/db";

// Validar API key desde headers
const validateApiKey = (request: Request): boolean => {
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.SYNC_API_KEY;

    if (!expectedKey) {
        console.warn("SYNC_API_KEY no configurada en .env");
        return false;
    }

    return apiKey === expectedKey;
};

const companySchema = z.object({
    externalId: z.string(), // ID de TagleLabs
    name: z.string().min(1),
    rut: z.string().optional().nullable(),
    emailContacto: z.string().email().optional().nullable(),
    telefonoContacto: z.string().optional().nullable(),
});

export async function POST(request: Request) {
    try {
        // Validar autenticaciИn
        if (!validateApiKey(request)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const data = companySchema.parse(body);

        const result = await withTransaction(async (client) => {
            // Buscar si ya existe la empresa por externalId o nombre
            const existing = await client.query<{ id: string }>(
                `SELECT id FROM "Company" WHERE "name" = $1`,
                [data.name]
            );

            if (existing.rows.length > 0) {
                const companyId = existing.rows[0].id;

                // Actualizar empresa existente
                await client.query(
                    `UPDATE "Company" SET 
                        "rut" = COALESCE($1, "rut"),
                        "emailContacto" = COALESCE($2, "emailContacto"),
                        "telefonoContacto" = COALESCE($3, "telefonoContacto"),
                        "updatedAt" = NOW()
                     WHERE "id" = $4`,
                    [data.rut, data.emailContacto, data.telefonoContacto, companyId]
                );

                return {
                    success: true,
                    action: "updated" as const,
                    companyId
                };
            }

            // Crear nueva empresa
            const newId = crypto.randomUUID();
            const kioskSlug = data.name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);
            const kioskPin = Math.floor(1000 + Math.random() * 9000).toString();

            await client.query(
                `INSERT INTO "Company" 
                    ("id", "name", "rut", "emailContacto", "telefonoContacto", "isActive", "kioskSlug", "kioskPin", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, true, $6, $7, NOW(), NOW())`,
                [newId, data.name, data.rut, data.emailContacto, data.telefonoContacto, kioskSlug, kioskPin]
            );

            // Crear configuraciИn de pagos por defecto
            await client.query(
                `INSERT INTO "CompanyPaySetting" 
                    ("id", "companyId", "valorHoraBaseGlobal", "sueldoMensualBase", "factorExtraSemana", "weekendDayRate", "weekendExtraHourRate", "createdAt", "updatedAt")
                 VALUES ($1, $2, 4500, 500000, 1.5, 60000, 8000, NOW(), NOW())`,
                [crypto.randomUUID(), newId]
            );

            return {
                success: true,
                action: "created" as const,
                companyId: newId,
                kioskSlug,
                kioskPin
            };
        });

        return NextResponse.json(result);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos invケlidos", details: error.issues }, { status: 400 });
        }
        console.error("Error en sync/company:", error);
        return NextResponse.json({ error: "Error al sincronizar empresa" }, { status: 500 });
    }
}
