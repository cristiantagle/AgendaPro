import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getCompanyById } from "@/lib/repos/companies";
import { getEmployeeByUserId } from "@/lib/repos/employees";
import { getUserById } from "@/lib/repos/users";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 404 });
  }

  const company = user.companyId
    ? await getCompanyById(user.companyId)
    : null;
  const employee =
    user.role === "worker"
      ? await getEmployeeByUserId(user.id)
      : null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      company: company ? { id: company.id, name: company.name } : null,
      employee: employee
        ? {
            id: employee.id,
            nombreCompleto: employee.nombreCompleto,
            valorHoraBase: employee.valorHoraBase,
            sueldoMensual: employee.sueldoMensual,
          }
        : null,
    },
  });
}
