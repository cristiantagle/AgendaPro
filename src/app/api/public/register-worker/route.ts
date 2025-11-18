import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { getCompanyById } from "@/lib/repos/companies";
import { createEmployee } from "@/lib/repos/employees";
import { createUser, getUserByEmail } from "@/lib/repos/users";
import { workerSelfSignupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json();
  const data = workerSelfSignupSchema.parse(payload);

  const company = await getCompanyById(data.companyId);

  if (!company || !company.isActive) {
    return NextResponse.json(
      { error: "La empresa seleccionada no existe o está inactiva." },
      { status: 400 },
    );
  }

  const existingUser = await getUserByEmail(data.email);

  if (existingUser) {
    return NextResponse.json(
      { error: "Este correo ya está registrado. Intenta iniciar sesión." },
      { status: 400 },
    );
  }

  const passwordHash = await hash(data.password, 10);

  const user = await createUser({
    email: data.email,
    passwordHash,
    role: "worker",
    companyId: data.companyId,
  });

  if (!user) {
    return NextResponse.json(
      { error: "No se pudo crear el usuario." },
      { status: 500 },
    );
  }

  await createEmployee({
    companyId: data.companyId,
    userId: user.id,
    nombreCompleto: data.nombreCompleto,
    rut: data.rut ?? null,
    sueldoMensual: data.sueldoMensual ?? null,
  });

  return NextResponse.json({
    success: true,
    message: "Registro completado. Ya puedes iniciar sesión.",
  });
}
