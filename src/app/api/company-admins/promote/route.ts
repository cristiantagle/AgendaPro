import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { updateUser } from "@/lib/repos/users";
import { getEmployeeWithUserAndCompany } from "@/lib/repos/employees";
import { promoteWorkerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const data = promoteWorkerSchema.parse(await request.json());

  const result = await getEmployeeWithUserAndCompany(data.employeeId);

  if (!result) {
    return NextResponse.json(
      { error: "Trabajador no encontrado" },
      { status: 404 },
    );
  }

  if (result.user.role !== "worker") {
    return NextResponse.json(
      { error: "Este usuario ya tiene otro rol y no puede ser promovido." },
      { status: 400 },
    );
  }

  const updatedUser = await updateUser(result.user.id, {
    role: "company_admin",
    companyId: result.employee.companyId,
  });

  return NextResponse.json({
    success: true,
    admin: updatedUser,
    company: result.company,
  });
}
