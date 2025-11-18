import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { listSchedules, replaceSchedules } from "@/lib/repos/companies";
import { scheduleListSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const schedules = await listSchedules(session.companyId!);

  return NextResponse.json({ schedules });
}

export async function PUT(request: Request) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const body = await request.json();
  const { schedules } = scheduleListSchema.parse(body);

  await replaceSchedules(session.companyId!, schedules);

  return NextResponse.json({ success: true });
}
