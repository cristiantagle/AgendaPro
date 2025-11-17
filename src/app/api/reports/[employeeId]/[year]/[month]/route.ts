import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { monthlySummaryToCsv, monthlySummaryToPdf } from "@/lib/report-export";
import { getMonthlySummaryForEmployee } from "@/lib/report-service";

const paramsSchema = z.object({
  employeeId: z.string().uuid(),
  year: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string; year: string; month: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resolvedParams = await context.params;
  const { employeeId, year, month } = paramsSchema.parse({
    employeeId: resolvedParams.employeeId,
    year: resolvedParams.year,
    month: resolvedParams.month,
  });

  const format =
    new URL(request.url).searchParams.get("format")?.toLowerCase() ?? "pdf";

  if (!["pdf", "csv"].includes(format)) {
    return NextResponse.json(
      { error: "Formato inválido" },
      { status: 400 },
    );
  }

  try {
    const summary = await getMonthlySummaryForEmployee(
      employeeId,
      month,
      year,
      session,
    );

    if (format === "csv") {
      const csv = monthlySummaryToCsv(summary);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=reporte-${month}-${year}.csv`,
        },
      });
    }

    const pdf = await monthlySummaryToPdf(summary);
    const pdfBytes = new Uint8Array(pdf);
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=reporte-${month}-${year}.pdf`,
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Error generando archivo" },
      { status },
    );
  }
}
