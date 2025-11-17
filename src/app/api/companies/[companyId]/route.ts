import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        where: { role: "company_admin" },
        select: { id: true, email: true },
      },
      paySettings: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ company });
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

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name,
      rut: data.rut,
      emailContacto: data.emailContacto,
      telefonoContacto: data.telefonoContacto,
      isActive: data.isActive ?? undefined,
    },
  });

  return NextResponse.json({ company });
}
