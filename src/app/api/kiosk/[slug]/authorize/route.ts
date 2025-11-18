import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { generateDeviceToken, kioskCookieName } from "@/lib/kiosk";
import {
  createDevice,
  getDeviceByToken,
} from "@/lib/repos/kiosk-devices";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { kioskAuthorizeSchema } from "@/lib/validation";

type Params = {
  slug: string;
};

const extractToken = async (request: Request, slug: string) => {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(kioskCookieName(slug))?.value;
  const headerToken =
    request.headers.get("authorization") ??
    request.headers.get("x-kiosk-token");
  const normalizedHeader =
    headerToken?.startsWith("Bearer ")
      ? headerToken.slice(7)
      : headerToken ?? null;
  return cookieToken ?? normalizedHeader ?? null;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  const params = await context.params;
  const data = kioskAuthorizeSchema.parse(await request.json());
  const company = await getCompanyBySlug(params.slug);

  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  if (company.kioskPin !== data.pin) {
    return NextResponse.json(
      { error: "PIN inválido" },
      { status: 401 },
    );
  }

  const token = generateDeviceToken();
  const device = await createDevice({
    companyId: company.id,
    token,
    name: data.deviceName ?? `Terminal ${new Date().toLocaleDateString()}`,
  });

  const response = NextResponse.json({
    device: device ? { id: device.id, name: device.name } : null,
    token,
  });
  response.cookies.set({
    name: kioskCookieName(company.kioskSlug),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

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

  const token = await extractToken(request, params.slug);

  if (!token) {
    return NextResponse.json(
      { device: null },
      { status: 401 },
    );
  }

  const device = await getDeviceByToken(token);

  if (!device || device.companyId !== company.id) {
    return NextResponse.json(
      { device: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    device: { id: device.id, name: device.name },
  });
}
