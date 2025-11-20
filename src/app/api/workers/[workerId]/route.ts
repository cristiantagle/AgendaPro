import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import {
  getEmployeeById,
  getEmployeeWithUser,
  updateEmployee,
} from "@/lib/repos/employees";
import { updateWorkerSchema } from "@/lib/validation";
import { ZodError } from "zod";

const paramsSchema = z.object({
  workerId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ workerId: string }> },
) {
  const session = await getSession();
  const { workerId } = paramsSchema.parse(await context.params);

  const employee = await getEmployeeWithUser(workerId);

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
  try {
    const session = await getSession();
    assertRole(session, ["company_admin", "superadmin"]);
    const { workerId } = paramsSchema.parse(await context.params);

    const payload = await request.json();
    const data = updateWorkerSchema.parse(payload);

    const existing = await getEmployeeById(workerId);
    if (!existing) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 },
      );
    }
    if (
      session.role === "company_admin" &&
      existing.companyId !== session.companyId
    ) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 },
      );
    }

    const employee = await updateEmployee(workerId, {
      nombreCompleto: data.nombreCompleto,
      rut: data.rut ?? null,
      sueldoMensual: data.sueldoMensual ?? null,
      isActive: data.isActive ?? existing.isActive,
    });

    return NextResponse.json({ employee });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    console.error("Error actualizando trabajador:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el trabajador" },
      { status: 500 },
    );
  }
}
