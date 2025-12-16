import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { getAuditLogByRecordId } from "@/lib/repos/audit";

export async function GET(request: Request) {
    const session = await getSession();
    assertRole(session, ["company_admin"]);

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId");

    if (!recordId) {
        return NextResponse.json(
            { error: "Falta parámetro recordId" },
            { status: 400 }
        );
    }

    const logs = await getAuditLogByRecordId(recordId);

    return NextResponse.json({ logs });
}
