import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import {
    listFuelRecordsByCompany,
    createFuelRecord,
} from "@/lib/repos/fuel-records";
import { getVehicleById } from "@/lib/repos/vehicles";

const createFuelRecordSchema = z.object({
    vehicleId: z.string().uuid(),
    employeeId: z.string().uuid().optional(),
    fecha: z.string().transform((val) => new Date(val)),
    litros: z.number().positive("Los litros deben ser positivos"),
    kilometraje: z.number().int().positive().optional(),
    tipoCombustible: z.enum(["bencina_93", "bencina_95", "bencina_97", "diesel", "electrico", "otro"]),
    costoTotal: z.number().positive().optional(),
    precioLitro: z.number().positive().optional(),
    estacion: z.string().optional(),
    observaciones: z.string().optional(),
});

export async function GET(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
    const fromDate = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const toDate = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

    const records = await listFuelRecordsByCompany(session.companyId!, {
        limit,
        fromDate,
        toDate,
    });

    return NextResponse.json({ records });
}

export async function POST(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    try {
        const payload = await request.json();
        const data = createFuelRecordSchema.parse(payload);

        // Verificar que el vehículo existe y pertenece a la empresa
        const vehicle = await getVehicleById(data.vehicleId);
        if (!vehicle || vehicle.companyId !== session.companyId) {
            return NextResponse.json(
                { error: "Vehículo no encontrado" },
                { status: 404 }
            );
        }

        const record = await createFuelRecord({
            ...data,
            companyId: session.companyId!,
        });

        return NextResponse.json({ record });
    } catch (error) {
        if (error instanceof ZodError) {
            const message =
                error.issues[0]?.message ??
                "Revisa los datos ingresados e inténtalo nuevamente.";
            return NextResponse.json({ error: message }, { status: 400 });
        }
        throw error;
    }
}
