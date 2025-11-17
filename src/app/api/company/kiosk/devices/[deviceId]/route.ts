import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { deleteDevice, getDeviceById } from "@/lib/repos/kiosk-devices";

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

  const device = await getDeviceById(params.deviceId);

  if (!device || device.companyId !== session.companyId) {
    return NextResponse.json(
      { error: "Kiosco no encontrado" },
      { status: 404 },
    );
  }

  await deleteDevice(params.deviceId);

  return NextResponse.json({ success: true });
}
