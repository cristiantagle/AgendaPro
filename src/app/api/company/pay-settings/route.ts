import { NextResponse } from "next/server";

import { assertRole, getSession, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paySettingsSchema } from "@/lib/validation";

export async function GET() {
  const session = requireSession(await getSession());
  assertRole(session, ["company_admin"]);

  const settings = await prisma.companyPaySetting.findUnique({
    where: { companyId: session.companyId! },
  });

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = requireSession(await getSession());
  assertRole(session, ["company_admin"]);

  const payload = await request.json();
  const data = paySettingsSchema.parse(payload);
  const existing = await prisma.companyPaySetting.findUnique({
    where: { companyId: session.companyId! },
  });

  const updateData = {
    sueldoMensualBase: data.sueldoMensualBase,
    factorExtraSemana: data.factorExtraSemana,
    weekendDayRate: data.weekendDayRate,
    weekendExtraHourRate: data.weekendExtraHourRate,
    valorHoraBaseGlobal: existing?.valorHoraBaseGlobal ?? 4500,
  };

  const settings = await prisma.companyPaySetting.upsert({
    where: { companyId: session.companyId! },
    update: updateData,
    create: { companyId: session.companyId!, ...updateData },
  });

  return NextResponse.json({ settings });
}
