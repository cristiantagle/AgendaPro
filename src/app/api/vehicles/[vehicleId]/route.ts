import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import {
    getVehicleById,
    updateVehicle,
    deleteVehicle,
} from "@/lib/repos/vehicles";

const updateVehicleSchema = z.object({
    patente: z.string().min(5).max(10).optional(),
    marca: z.string().optional(),
    modelo: z.string().optional(),
    anio: z.number().min(1900).max(2100).optional(),
    tipoCombustible: z.enum(["bencina_93", "bencina_95", "bencina_97", "diesel", "electrico", "otro"]).optional(),
    isActive: z.boolean().optional(),
});

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ vehicleId: string }> }
) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { vehicleId } = await params;
    const vehicle = await getVehicleById(vehicleId);

    if (!vehicle || vehicle.companyId !== session.companyId) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ vehicleId: string }> }
) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { vehicleId } = await params;
    const existing = await getVehicleById(vehicleId);

    if (!existing || existing.companyId !== session.companyId) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    try {
        const payload = await request.json();
        const data = updateVehicleSchema.parse(payload);

        const vehicle = await updateVehicle(vehicleId, data);

        return NextResponse.json({ vehicle });
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

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ vehicleId: string }> }
) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { vehicleId } = await params;
    const existing = await getVehicleById(vehicleId);

    if (!existing || existing.companyId !== session.companyId) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    await deleteVehicle(vehicleId);

    return NextResponse.json({ success: true });
}
