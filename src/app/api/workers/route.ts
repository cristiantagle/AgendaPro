import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWorkerSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const workers = await prisma.employee.findMany({
    where: { companyId: session.companyId! },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ workers });
}

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const payload = await request.json();
  const data = createWorkerSchema.parse(payload);

  const passwordHash = await hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: "worker",
      companyId: session.companyId!,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      companyId: session.companyId!,
      userId: user.id,
      nombreCompleto: data.nombreCompleto,
      rut: data.rut,
      valorHoraBase: undefined,
      sueldoMensual: data.sueldoMensual ?? undefined,
    },
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({ employee });
}
