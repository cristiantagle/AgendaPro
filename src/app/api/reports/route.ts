import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMonthlySummaryForEmployee } from "@/lib/report-service";
import { reportQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const query = reportQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  try {
    const summary = await getMonthlySummaryForEmployee(
      query.employeeId,
      query.month,
      query.year,
      session,
    );

    return NextResponse.json({ summary });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Error generando el reporte" },
      { status },
    );
  }
}
