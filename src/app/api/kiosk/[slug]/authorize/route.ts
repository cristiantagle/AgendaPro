import { NextResponse } from "next/server";

import { generateDeviceToken, kioskCookieName } from "@/lib/kiosk";
import { createDevice } from "@/lib/repos/kiosk-devices";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { kioskAuthorizeSchema } from "@/lib/validation";

type Params = {
  slug: string;
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
