import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { assertRole, getSession } from "@/lib/auth";
import { getCompanyById } from "@/lib/repos/companies";
import { createEmployee } from "@/lib/repos/employees";
import { createUser, getUserByEmail } from "@/lib/repos/users";
import { createAdminSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const data = createAdminSchema.parse(await request.json());

  const company = await getCompanyById(data.companyId);

  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  const existingUser = await getUserByEmail(data.email);

  if (existingUser) {
    return NextResponse.json(
      {
        error:
          "Este correo ya está registrado. Usa otro correo o solicita recuperación de acceso.",
      },
      { status: 409 },
    );
  }

  const passwordHash = await hash(data.password, 10);

  const admin = await createUser({
    email: data.email,
    passwordHash,
    role: "company_admin",
    companyId: company.id,
  });

  if (admin) {
    await createEmployee({
      companyId: company.id,
      userId: admin.id,
      nombreCompleto: data.nombreCompleto,
      rut: null,
      sueldoMensual: null,
    });
  }

  return NextResponse.json({ admin });
}
