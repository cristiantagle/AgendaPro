import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const data = createAdminSchema.parse(await request.json());

  const company = await prisma.company.findUnique({
    where: { id: data.companyId },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

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

  const admin = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: "company_admin",
      companyId: company.id,
    },
  });

  return NextResponse.json({ admin });
}
