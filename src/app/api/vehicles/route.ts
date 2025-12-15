import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import {
    listActiveVehiclesByCompany,
    createVehicle,
    getVehicleByPatente,
} from "@/lib/repos/vehicles";

const createVehicleSchema = z.object({
    patente: z.string().min(5, "Patente inválida").max(10),
    marca: z.string().optional(),
    modelo: z.string().optional(),
    anio: z.number().min(1900).max(2100).optional(),
    tipoCombustible: z.enum(["bencina_93", "bencina_95", "bencina_97", "diesel", "electrico", "otro"]).optional(),
});

export async function GET() {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const vehicles = await listActiveVehiclesByCompany(session.companyId!);

    return NextResponse.json({ vehicles });
}

export async function POST(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    try {
        const payload = await request.json();
        const data = createVehicleSchema.parse(payload);

        // Verificar si ya existe un vehículo con esa patente
        const existing = await getVehicleByPatente(session.companyId!, data.patente);
        if (existing) {
            return NextResponse.json(
                { error: "Ya existe un vehículo con esa patente" },
                { status: 400 }
            );
        }

        const vehicle = await createVehicle({
            companyId: session.companyId!,
            ...data,
        });

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
