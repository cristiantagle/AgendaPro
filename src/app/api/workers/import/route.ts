import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { assertRole, getSession } from "@/lib/auth";
import { listEmployeesByCompany, createEmployee, updateEmployee } from "@/lib/repos/employees";
import { createUser, getUserByEmail } from "@/lib/repos/users";

const normalize = (s: string) =>
    s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const slugify = (s: string) =>
    normalize(s).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30);

const cleanRut = (rut: string) =>
    rut.replace(/[.\-\s]/g, "");

export async function POST(request: Request) {
    try {
        const session = await getSession();
        assertRole(session, ["company_admin"]);

        const body = await request.json();
        const { workers } = body;

        if (!Array.isArray(workers)) {
            return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
        }

        const currentEmployees = await listEmployeesByCompany(session.companyId!);
        let updatedCount = 0;
        let createdCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const item of workers) {
            // --- Intentar buscar match con empleado existente ---
            let match = null;

            // Buscar por email
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
                // --- Actualizar empleado existente ---
                const updates: Partial<{
                    rut: string;
                    sueldoMensual: number;
                    afp: string | null;
                    salud: string | null;
                }> = {};
                if (item.rut) updates.rut = String(item.rut);
                if (item.sueldo) updates.sueldoMensual = Number(item.sueldo);
                if (item.afp) updates.afp = String(item.afp);
                if (item.salud) updates.salud = String(item.salud);

                if (Object.keys(updates).length > 0) {
                    await updateEmployee(match.id, updates);
                    updatedCount++;
                }
            } else {
                // --- Crear trabajador nuevo ---
                const nombre = item.nombre ? String(item.nombre).trim() : "";
                if (!nombre) {
                    skippedCount++;
                    continue;
                }

                // Determinar email
                let email = "";
                if (item.email) {
                    email = String(item.email).trim().toLowerCase();
                } else if (item.rut) {
                    email = `${cleanRut(String(item.rut))}@importado.local`;
                } else {
                    const slug = slugify(nombre);
                    const short = crypto.randomUUID().slice(0, 6);
                    email = `${slug}-${short}@importado.local`;
                }

                // Verificar que no exista ya un usuario con ese email
                const existingUser = await getUserByEmail(email);
                if (existingUser) {
                    errors.push(`${nombre}: email "${email}" ya existe`);
                    skippedCount++;
                    continue;
                }

                // Contraseña: RUT si viene, sino genérica
                const rawPassword = item.rut ? cleanRut(String(item.rut)) : "Asistencia2026";
                const passwordHash = await hash(rawPassword, 10);

                const user = await createUser({
                    email,
                    passwordHash,
                    role: "worker",
                    companyId: session.companyId!,
                });

                if (!user) {
                    errors.push(`${nombre}: no se pudo crear usuario`);
                    skippedCount++;
                    continue;
                }

                await createEmployee({
                    companyId: session.companyId!,
                    userId: user.id,
                    nombreCompleto: nombre,
                    rut: item.rut ? String(item.rut) : null,
                    sueldoMensual: item.sueldo ? Number(item.sueldo) : null,
                    afp: item.afp ? String(item.afp) : null,
                    salud: item.salud ? String(item.salud) : null,
                });

                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            created: createdCount,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error("Error importing workers:", error);
        return NextResponse.json(
            { error: "Error interno al procesar archivo" },
            { status: 500 }
        );
    }
}
