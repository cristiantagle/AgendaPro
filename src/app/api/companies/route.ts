import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { createCompany, listCompaniesWithCounts } from "@/lib/repos/companies";
import { createCompanySchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const companies = await listCompaniesWithCounts();

  return NextResponse.json({
    companies: companies.map((company) => ({
      ...company,
      _count: { employees: company.employeesCount },
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const payload = await request.json();
  const data = createCompanySchema.parse(payload);

  const company = await createCompany({
    name: data.name,
    rut: data.rut ?? null,
    emailContacto: data.emailContacto ?? null,
    telefonoContacto: data.telefonoContacto ?? null,
  });

  return NextResponse.json({ company });
}
