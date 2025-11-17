import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { kioskCookieName } from "@/lib/kiosk";
import { prisma } from "@/lib/prisma";
import { markEmployeeAttendance } from "@/lib/time-records-service";
import { kioskMarkSchema } from "@/lib/validation";

type Params = {
  slug: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  const params = await context.params;
  const cookieStore = await cookies();
  const token =
    cookieStore.get(kioskCookieName(params.slug))?.value ?? null;

  if (!token) {
    return NextResponse.json(
      { error: "Dispositivo no autorizado" },
      { status: 401 },
    );
  }

  const device = await prisma.kioskDevice.findUnique({
    where: { token },
  });

  if (!device) {
    return NextResponse.json(
      { error: "Dispositivo desconocido" },
      { status: 401 },
    );
  }

  const company = await prisma.company.findFirst({
    where: { kioskSlug: params.slug },
  });

  if (!company || company.id !== device.companyId) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  const payload = kioskMarkSchema.parse(await request.json());

  const employee = await prisma.employee.findUnique({
    where: { id: payload.employeeId },
  });

  if (!employee || employee.companyId !== company.id) {
    return NextResponse.json(
      { error: "Trabajador inválido para este kiosco" },
      { status: 400 },
    );
  }

  try {
    const result = await markEmployeeAttendance(
      employee.id,
      payload.action,
      { enforceStartCutoff: true },
    );
    await prisma.kioskDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });
    return NextResponse.json({ record: result.record });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: (error as Error).message },
      { status },
    );
  }
}
