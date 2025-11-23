import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { kioskCookieName } from "@/lib/kiosk";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { getEmployeeWithUserAndCompany } from "@/lib/repos/employees";
import { getDeviceByToken } from "@/lib/repos/kiosk-devices";
import { kioskAdminUnlockSchema } from "@/lib/validation";

type Params = {
  slug: string;
};

const resolveDeviceToken = async (request: Request, slug: string) => {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(kioskCookieName(slug))?.value ?? null;
  const headerToken =
    request.headers.get("authorization") ??
    request.headers.get("x-kiosk-token");
  const normalizedHeader =
    headerToken?.startsWith("Bearer ")
      ? headerToken.slice(7)
      : headerToken ?? null;
  return cookieToken ?? normalizedHeader ?? null;
};

const unauthorized = (slug: string, message: string) => {
  const response = NextResponse.json({ error: message }, { status: 401 });
  response.cookies.delete(kioskCookieName(slug));
  return response;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  const params = await context.params;
  const company = await getCompanyBySlug(params.slug);

  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  const token = await resolveDeviceToken(request, params.slug);
  if (!token) {
    return unauthorized(params.slug, "Dispositivo no autorizado.");
  }
  const device = await getDeviceByToken(token);
  if (!device || device.companyId !== company.id) {
    return unauthorized(
      params.slug,
      "Dispositivo no reconocido. Autoriza nuevamente este kiosco.",
    );
  }

  const payload = kioskAdminUnlockSchema.parse(await request.json());

  if (company.kioskPin !== payload.pin) {
    return NextResponse.json({ error: "PIN inv\u00e1lido" }, { status: 401 });
  }

  const employee = await getEmployeeWithUserAndCompany(payload.employeeId);

  if (
    !employee ||
    employee.employee.companyId !== company.id ||
    !employee.employee.isActive
  ) {
    return NextResponse.json(
      { error: "Administrador inv\u00e1lido para esta empresa" },
      { status: 400 },
    );
  }

  if (employee.user.role !== "company_admin") {
    return NextResponse.json(
      { error: "S\u00f3lo se pueden enrolar administradores" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    admin: {
      id: employee.employee.id,
      nombreCompleto: employee.employee.nombreCompleto,
    },
  });
}
