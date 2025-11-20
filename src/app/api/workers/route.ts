import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { assertRole, getSession } from "@/lib/auth";
import { ZodError } from "zod";

import { listEmployeesByCompany, createEmployee } from "@/lib/repos/employees";
import { createUser } from "@/lib/repos/users";
import { createWorkerSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const workers = await listEmployeesByCompany(session.companyId!);

  return NextResponse.json({ workers });
}

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  try {
    const payload = await request.json();
    const data = createWorkerSchema.parse(payload);

    const passwordHash = await hash(data.password, 10);

    const user = await createUser({
      email: data.email,
      passwordHash,
      role: "worker",
      companyId: session.companyId!,
    });

    const employee = await createEmployee({
      companyId: session.companyId!,
      userId: user!.id,
      nombreCompleto: data.nombreCompleto,
      rut: data.rut,
      sueldoMensual: data.sueldoMensual ?? null,
    });

    return NextResponse.json({ employee });
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
