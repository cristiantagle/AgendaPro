import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { kioskCookieName } from "@/lib/kiosk";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { getEmployeeById } from "@/lib/repos/employees";
import {
  listFacesByCompany,
  upsertEmployeeFace,
} from "@/lib/repos/employee-faces";
import { getDeviceByToken } from "@/lib/repos/kiosk-devices";
import { kioskFaceEnrollmentSchema } from "@/lib/validation";

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

const requireAuthorizedDevice = async (
  request: Request,
  slug: string,
  companyId: string,
): Promise<
  | { device: { id: string; companyId: string }; token: string }
  | { error: NextResponse }
> => {
  const token = await resolveDeviceToken(request, slug);
  if (!token) {
    return { error: unauthorized(slug, "Dispositivo no autorizado.") };
  }
  const device = await getDeviceByToken(token);
  if (!device || device.companyId !== companyId) {
    return {
      error: unauthorized(
        slug,
        "Dispositivo no reconocido. Autoriza nuevamente este kiosco.",
      ),
    };
  }
  return { device, token };
};

export async function GET(
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
  const authorization = await requireAuthorizedDevice(
    request,
    params.slug,
    company.id,
  );
  if ("error" in authorization) {
    return authorization.error;
  }
  const faces = await listFacesByCompany(company.id);
  return NextResponse.json({
    faces: faces.map((face) => ({
      employeeId: face.employeeId,
      descriptor: face.descriptor,
      updatedAt: face.updatedAt.toISOString(),
    })),
  });
}

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
  const authorization = await requireAuthorizedDevice(
    request,
    params.slug,
    company.id,
  );
  if ("error" in authorization) {
    return authorization.error;
  }
  const payload = kioskFaceEnrollmentSchema.parse(await request.json());
  const employee = await getEmployeeById(payload.employeeId);
  if (!employee || employee.companyId !== company.id || !employee.isActive) {
    return NextResponse.json(
      { error: "Trabajador inválido para esta empresa" },
      { status: 400 },
    );
  }
  await upsertEmployeeFace(employee.id, payload.descriptor);
  return NextResponse.json({ success: true });
}
