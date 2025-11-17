import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markEmployeeAttendance } from "@/lib/time-records-service";
import { markActionSchema } from "@/lib/validation";

const listQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const query = listQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  let employeeId = query.employeeId;
  if (session.role === "worker") {
    const employee = await prisma.employee.findFirst({
      where: { userId: session.userId },
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }
    employeeId = employee.id;
  }

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;

  if (session.role === "company_admin") {
    where.companyId = session.companyId!;
  }

  if (session.role === "worker") {
    where.companyId = session.companyId!;
  }

  if (query.start && query.end) {
    where.fecha = {
      gte: new Date(query.start),
      lte: new Date(query.end),
    };
  }

  const records = await prisma.timeRecord.findMany({
    where,
    orderBy: { fecha: "desc" },
    include: {
      employee: {
        select: { nombreCompleto: true },
      },
    },
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["worker"]);

  const action = markActionSchema.parse(await request.json());

  const employee = await prisma.employee.findFirst({
    where: { userId: session.userId },
  });

  if (!employee) {
    return NextResponse.json(
      { error: "Empleado no encontrado" },
      { status: 404 },
    );
  }

  try {
    const result = await markEmployeeAttendance(employee.id, action.action);
    return NextResponse.json({ record: result.record });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: (error as Error).message },
      { status },
    );
  }
}
