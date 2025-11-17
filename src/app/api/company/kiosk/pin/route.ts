import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { generateKioskPin } from "@/lib/kiosk";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const pin = generateKioskPin();
  await prisma.company.update({
    where: { id: session.companyId! },
    data: { kioskPin: pin },
  });

  return NextResponse.json({ pin });
}
