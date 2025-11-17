import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { generateKioskPin } from "@/lib/kiosk";
import { updateCompany } from "@/lib/repos/companies";

export async function POST() {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const pin = generateKioskPin();
  await updateCompany(session.companyId!, { kioskPin: pin });

  return NextResponse.json({ pin });
}
