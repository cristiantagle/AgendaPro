import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  deviceId: string;
};

export async function DELETE(
  _request: Request,
  context: { params: Promise<Params> },
) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);
  const params = await context.params;

  const device = await prisma.kioskDevice.findUnique({
    where: { id: params.deviceId },
  });

  if (!device || device.companyId !== session.companyId) {
    return NextResponse.json(
      { error: "Kiosco no encontrado" },
      { status: 404 },
    );
  }

  await prisma.kioskDevice.delete({
    where: { id: params.deviceId },
  });

  return NextResponse.json({ success: true });
}
