import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promoteWorkerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const data = promoteWorkerSchema.parse(await request.json());

  const employee = await prisma.employee.findUnique({
    where: { id: data.employeeId },
    include: {
      user: true,
      company: { select: { id: true, name: true } },
    },
  });

  if (!employee || !employee.user || !employee.company) {
    return NextResponse.json(
      { error: "Trabajador no encontrado" },
      { status: 404 },
    );
  }

  if (employee.user.role !== "worker") {
    return NextResponse.json(
      { error: "Este usuario ya tiene otro rol y no puede ser promovido." },
      { status: 400 },
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: employee.userId },
    data: {
      role: "company_admin",
      companyId: employee.companyId,
    },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({
    success: true,
    admin: updatedUser,
    company: employee.company,
  });
}
