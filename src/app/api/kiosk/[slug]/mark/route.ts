import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { kioskCookieName } from "@/lib/kiosk";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { getEmployeeById } from "@/lib/repos/employees";
import {
  getDeviceByToken,
  updateDevice,
} from "@/lib/repos/kiosk-devices";
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

  const respondDeviceError = (message: string, status = 401) => {
    const response = NextResponse.json({ error: message }, { status });
    response.cookies.delete(kioskCookieName(params.slug));
    return response;
  };

  if (!token) {
    return respondDeviceError(
      "Dispositivo no autorizado. Autoriza este kiosco con el PIN.",
    );
  }

  const device = await getDeviceByToken(token);

  if (!device) {
    return respondDeviceError(
      "Dispositivo no reconocido. Debes volver a autorizarlo con el PIN.",
    );
  }

  const company = await getCompanyBySlug(params.slug);

  if (!company || company.id !== device.companyId) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  const payload = kioskMarkSchema.parse(await request.json());

  const employee = await getEmployeeById(payload.employeeId);

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
    await updateDevice(device.id, { lastUsedAt: new Date() });
    return NextResponse.json({ record: result.record });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: (error as Error).message },
      { status },
    );
  }
}
