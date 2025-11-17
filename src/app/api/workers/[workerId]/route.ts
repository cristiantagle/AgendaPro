import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateWorkerSchema } from "@/lib/validation";

const paramsSchema = z.object({
  workerId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ workerId: string }> },
) {
  const session = await getSession();
  const { workerId } = paramsSchema.parse(await context.params);

  const employee = await prisma.employee.findUnique({
    where: { id: workerId },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!employee) {
    return NextResponse.json(
      { error: "Trabajador no encontrado" },
      { status: 404 },
    );
  }

  if (session?.role === "worker" && employee.userId !== session.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (
    session?.role === "company_admin" &&
    employee.companyId !== session.companyId
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (session?.role === "superadmin") {
    return NextResponse.json({ employee });
  }

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({ employee });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workerId: string }> },
) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);
  const { workerId } = paramsSchema.parse(await context.params);

  const payload = await request.json();
  const data = updateWorkerSchema.parse(payload);

  const employee = await prisma.employee.update({
    where: { id: workerId, companyId: session.companyId! },
    data: {
      nombreCompleto: data.nombreCompleto,
      rut: data.rut,
      valorHoraBase: undefined,
      sueldoMensual: data.sueldoMensual ?? undefined,
      isActive: data.isActive ?? undefined,
    },
  });

  return NextResponse.json({ employee });
}
