import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import {
    getFuelRecordById,
    updateFuelRecord,
    deleteFuelRecord,
} from "@/lib/repos/fuel-records";

const updateFuelRecordSchema = z.object({
    employeeId: z.string().uuid().optional(),
    fecha: z.string().transform((val) => new Date(val)).optional(),
    litros: z.number().positive().optional(),
    kilometraje: z.number().int().positive().optional(),
    tipoCombustible: z.enum(["bencina_93", "bencina_95", "bencina_97", "diesel", "electrico", "otro"]).optional(),
    costoTotal: z.number().positive().optional(),
    precioLitro: z.number().positive().optional(),
    estacion: z.string().optional(),
    observaciones: z.string().optional(),
});

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ recordId: string }> }
) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { recordId } = await params;
    const record = await getFuelRecordById(recordId);

    if (!record || record.companyId !== session.companyId) {
        return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ record });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ recordId: string }> }
) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { recordId } = await params;
    const existing = await getFuelRecordById(recordId);

    if (!existing || existing.companyId !== session.companyId) {
        return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    try {
        const payload = await request.json();
        const data = updateFuelRecordSchema.parse(payload);

        const record = await updateFuelRecord(recordId, data);

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

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ recordId: string }> }
) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { recordId } = await params;
    const existing = await getFuelRecordById(recordId);

    if (!existing || existing.companyId !== session.companyId) {
        return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    await deleteFuelRecord(recordId);

    return NextResponse.json({ success: true });
}
