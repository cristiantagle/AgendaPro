import { NextResponse } from "next/server";

import { assertRole, getSession, requireSession } from "@/lib/auth";
import {
  getCompanyPaySettings,
  upsertCompanyPaySettings,
} from "@/lib/repos/companies";
import { paySettingsSchema } from "@/lib/validation";

export async function GET() {
  const session = requireSession(await getSession());
  assertRole(session, ["company_admin"]);

  const settings = await getCompanyPaySettings(session.companyId!);

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = requireSession(await getSession());
  assertRole(session, ["company_admin"]);

  const payload = await request.json();
  const data = paySettingsSchema.parse(payload);

  const settings = await upsertCompanyPaySettings(session.companyId!, {
    valorHoraBaseGlobal: 4500,
    sueldoMensualBase: data.sueldoMensualBase,
    factorExtraSemana: data.factorExtraSemana,
    weekendDayRate: data.weekendDayRate,
    weekendExtraHourRate: data.weekendExtraHourRate,
  });

  return NextResponse.json({ settings });
}
