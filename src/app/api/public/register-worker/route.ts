import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { workerSelfSignupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json();
  const data = workerSelfSignupSchema.parse(payload);

  const company = await prisma.company.findFirst({
    where: { id: data.companyId, isActive: true },
  });

  if (!company) {
    return NextResponse.json(
      { error: "La empresa seleccionada no existe o está inactiva." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Este correo ya está registrado. Intenta iniciar sesión." },
      { status: 400 },
    );
  }

  const passwordHash = await hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: "worker",
      companyId: data.companyId,
    },
  });

  await prisma.employee.create({
    data: {
      companyId: data.companyId,
      userId: user.id,
      nombreCompleto: data.nombreCompleto,
      rut: data.rut,
      sueldoMensual: data.sueldoMensual ?? undefined,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Registro completado. Ya puedes iniciar sesión.",
  });
}
