import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { generateDeviceToken, kioskCookieName } from "@/lib/kiosk";
import { prisma } from "@/lib/prisma";
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
  const company = await prisma.company.findFirst({
    where: { kioskSlug: params.slug },
  });

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
  const device = await prisma.kioskDevice.create({
    data: {
      companyId: company.id,
      token,
      name: data.deviceName ?? `Terminal ${new Date().toLocaleDateString()}`,
    },
    select: { id: true, name: true },
  });

  const response = NextResponse.json({ device });
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
