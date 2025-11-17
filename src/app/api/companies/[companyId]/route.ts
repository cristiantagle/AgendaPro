import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import {
  getCompanyById,
  getCompanyPaySettings,
  listCompanyAdmins,
  updateCompany,
} from "@/lib/repos/companies";
import { updateCompanySchema } from "@/lib/validation";

const paramsSchema = z.object({
  companyId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const { companyId } = paramsSchema.parse(await context.params);

  const company = await getCompanyById(companyId);

  if (!company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const admins = await listCompanyAdmins(companyId);
  const paySettings = await getCompanyPaySettings(companyId);

  return NextResponse.json({ company, admins, paySettings });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const { companyId } = paramsSchema.parse(await context.params);
  const payload = await request.json();
  const data = updateCompanySchema.parse(payload);

  const company = await updateCompany(companyId, {
    name: data.name,
    rut: data.rut ?? null,
    emailContacto: data.emailContacto ?? null,
    telefonoContacto: data.telefonoContacto ?? null,
    isActive: data.isActive ?? undefined,
  });

  return NextResponse.json({ company });
}
