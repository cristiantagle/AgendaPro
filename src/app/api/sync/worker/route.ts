import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { hash } from "bcryptjs";

import { runSingle } from "@/lib/db";

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

const workerSchema = z.object({
    companyName: z.string().min(1), // Nombre de la empresa para buscarla
    nombreCompleto: z.string().min(1),
    rut: z.string().optional().nullable(),
    email: z.string().email(),
    sueldoMensual: z.number().optional().nullable(),
});

export async function POST(request: Request) {
    try {
        // Validar autenticación
        if (!validateApiKey(request)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const data = workerSchema.parse(body);

        // Buscar la empresa por nombre
        const company = await runSingle<{ id: string }>(
            `SELECT id FROM "Company" WHERE "name" = $1`,
            [data.companyName]
        );

        if (!company) {
            return NextResponse.json({
                error: "Empresa no encontrada",
                details: `No existe empresa con nombre: ${data.companyName}`
            }, { status: 404 });
        }

        // Buscar si ya existe el usuario por email
        let user = await runSingle<{ id: string }>(
            `SELECT id FROM "User" WHERE "email" = $1`,
            [data.email]
        );

        if (!user) {
            // Crear usuario
            const userId = crypto.randomUUID();
            const defaultPassword = crypto.randomBytes(16).toString("hex"); // Temporal
            const passwordHash = await hash(defaultPassword, 10);

            await runSingle(
                `INSERT INTO "User" ("id", "email", "passwordHash", "role", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, 'worker', NOW(), NOW())`,
                [userId, data.email, passwordHash]
            );

            user = { id: userId };
        }

        // Buscar si ya existe el empleado en esta empresa
        const existingEmployee = await runSingle<{ id: string }>(
            `SELECT id FROM "Employee" WHERE "userId" = $1 AND "companyId" = $2`,
            [user.id, company.id]
        );

        if (existingEmployee) {
            // Actualizar empleado existente
            await runSingle(
                `UPDATE "Employee" SET 
                    "nombreCompleto" = $1,
                    "rut" = COALESCE($2, "rut"),
                    "sueldoMensual" = COALESCE($3, "sueldoMensual"),
                    "updatedAt" = NOW()
                 WHERE "id" = $4`,
                [data.nombreCompleto, data.rut, data.sueldoMensual, existingEmployee.id]
            );

            return NextResponse.json({
                success: true,
                action: "updated",
                employeeId: existingEmployee.id
            });
        }

        // Crear nuevo empleado
        const employeeId = crypto.randomUUID();

        await runSingle(
            `INSERT INTO "Employee" 
                ("id", "companyId", "userId", "nombreCompleto", "rut", "sueldoMensual", "isActive", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
            [employeeId, company.id, user.id, data.nombreCompleto, data.rut, data.sueldoMensual]
        );

        return NextResponse.json({
            success: true,
            action: "created",
            employeeId,
            userId: user.id
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        console.error("Error en sync/worker:", error);
        return NextResponse.json({ error: "Error al sincronizar trabajador" }, { status: 500 });
    }
}
