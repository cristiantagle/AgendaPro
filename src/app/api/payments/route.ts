import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { getEmployeeById } from "@/lib/repos/employees";
import { createPayment, listPaymentsByCompany } from "@/lib/repos/payments";
import { paymentCreateSchema } from "@/lib/validation";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await getSession();
  assertRole(session, ["company_admin", "superadmin"]);
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);

  const targetCompanyId =
    session.role === "company_admin"
      ? session.companyId!
      : searchParams.get("companyId");

  if (!targetCompanyId) {
    return NextResponse.json(
      { error: "Se requiere companyId" },
      { status: 400 },
    );
  }

  const payments = await listPaymentsByCompany(targetCompanyId, limit || 50);
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    assertRole(session, ["company_admin", "superadmin"]);
    const payload = await request.json();
    const data = paymentCreateSchema.parse(payload);

    const employee = await getEmployeeById(data.employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 },
      );
    }

    if (
      session.role === "company_admin" &&
      employee.companyId !== session.companyId
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const payment = await createPayment({
      companyId: employee.companyId,
      employeeId: employee.id,
      amount: data.amount,
      type: data.type,
      note: data.note ?? null,
      paidAt: data.paidAt ?? new Date(),
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo registrar el pago" },
      { status: 500 },
    );
  }
}
