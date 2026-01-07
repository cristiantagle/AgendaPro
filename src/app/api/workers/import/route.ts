import { NextResponse } from "next/server";
import { assertRole, getSession } from "@/lib/auth";
import { listEmployeesByCompany, updateEmployee } from "@/lib/repos/employees";

const normalize = (s: string) =>
    s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export async function POST(request: Request) {
    try {
        const session = await getSession();
        assertRole(session, ["company_admin"]);

        const body = await request.json();
        const { workers } = body; // Array of { nombre, rut, email, sueldo }

        if (!Array.isArray(workers)) {
            return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
        }

        const currentEmployees = await listEmployeesByCompany(session.companyId!);
        let updatedCount = 0;
        let notFoundCount = 0;

        for (const item of workers) {
            // Intentar buscar por email (si viene)
            let match = null;
            if (item.email) {
                match = currentEmployees.find(e =>
                    normalize(e.user.email) === normalize(item.email)
                );
            }

            // Si no, buscar por nombre
            if (!match && item.nombre) {
                match = currentEmployees.find(e =>
                    normalize(e.nombreCompleto) === normalize(item.nombre)
                );
            }

            if (match) {
                // Actualizar campos si vienen
                const updates: any = {};
                if (item.rut) updates.rut = item.rut;
                if (item.sueldo) updates.sueldoMensual = Number(item.sueldo);
                if (item.afp) updates.afp = item.afp;
                if (item.salud) updates.salud = item.salud;

                if (Object.keys(updates).length > 0) {
                    await updateEmployee(match.id, updates);
                    updatedCount++;
                }
            } else {
                notFoundCount++;
            }
        }

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            skipped: notFoundCount
        });

    } catch (error) {
        console.error("Error importing workers:", error);
        return NextResponse.json(
            { error: "Error interno al procesar archivo" },
            { status: 500 }
        );
    }
}
