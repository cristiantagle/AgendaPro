import { NextResponse } from "next/server";
import { z } from "zod";

import { runQuery } from "@/lib/db";

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

const querySchema = z
    .object({
        companyName: z.string().min(1),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .refine(({ startDate, endDate }) => startDate <= endDate, {
        message: "startDate debe ser menor o igual a endDate",
        path: ["endDate"],
    });

export async function GET(request: Request) {
    try {
        // Validar autenticación
        if (!validateApiKey(request)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = querySchema.parse({
            companyName: searchParams.get("companyName"),
            startDate: searchParams.get("startDate"),
            endDate: searchParams.get("endDate"),
        });

        // Buscar la empresa por nombre
        const companies = await runQuery<{ id: string }>(
            `SELECT id FROM "Company" WHERE "name" = $1 LIMIT 1`,
            [query.companyName]
        );

        const company = companies[0];
        if (!company) {
            return NextResponse.json(
                {
                    error: "Empresa no encontrada",
                    details: `No existe empresa con nombre: ${query.companyName}`,
                },
                { status: 404 }
            );
        }

        const records = await runQuery<{
            id: string;
            employeeId: string;
            employeeName: string;
            fecha: Date;
            tipoJornada: string;
            horaEntrada: Date | null;
            horaSalida: Date | null;
            esManual: boolean;
            notas: string | null;
        }>(
            `SELECT
                tr."id" AS "id",
                tr."employeeId" AS "employeeId",
                e."nombreCompleto" AS "employeeName",
                tr."fecha" AS "fecha",
                tr."tipoJornada" AS "tipoJornada",
                tr."horaEntrada" AS "horaEntrada",
                tr."horaSalida" AS "horaSalida",
                tr."esManual" AS "esManual",
                tr."notas" AS "notas"
            FROM "TimeRecord" tr
            JOIN "Employee" e ON e."id" = tr."employeeId"
            WHERE tr."companyId" = $1
              AND tr."fecha"::date BETWEEN $2::date AND $3::date
            ORDER BY tr."fecha" ASC, e."nombreCompleto" ASC`,
            [company.id, query.startDate, query.endDate]
        );

        return NextResponse.json({ records });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Parámetros inválidos", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Error en sync/attendance:", error);
        return NextResponse.json(
            { error: "Error al obtener asistencia" },
            { status: 500 }
        );
    }
}

