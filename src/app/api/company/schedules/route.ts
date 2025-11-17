import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleListSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const schedules = await prisma.companyWorkSchedule.findMany({
    where: { companyId: session.companyId! },
    orderBy: { diaSemana: "asc" },
  });

  return NextResponse.json({ schedules });
}

export async function PUT(request: Request) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const body = await request.json();
  const { schedules } = scheduleListSchema.parse(body);

  await prisma.$transaction([
    prisma.companyWorkSchedule.deleteMany({
      where: { companyId: session.companyId! },
    }),
    prisma.companyWorkSchedule.createMany({
      data: schedules.map((schedule) => ({
        ...schedule,
        companyId: session.companyId!,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
