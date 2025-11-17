import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import { startOfDayUtc } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { timeRecordCorrectionSchema } from "@/lib/validation";

const paramsSchema = z.object({
  recordId: z.string().uuid(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ recordId: string }> },
) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const { recordId } = paramsSchema.parse(await context.params);
  const record = await prisma.timeRecord.findUnique({
    where: { id: recordId, companyId: session.companyId! },
  });

  if (!record) {
    return NextResponse.json(
      { error: "Marcación no encontrada" },
      { status: 404 },
    );
  }

  const payload = await request.json();
  const data = timeRecordCorrectionSchema.parse(payload);

  const fecha = startOfDayUtc(new Date(data.fecha));

  const parseTime = (value: string | null | undefined) =>
    value ? new Date(value) : null;

  const updated = await prisma.timeRecord.update({
    where: { id: record.id },
    data: {
      fecha,
      horaEntrada: parseTime(data.horaEntrada),
      horaInicioAlmuerzo: parseTime(data.horaInicioAlmuerzo),
      horaFinAlmuerzo: parseTime(data.horaFinAlmuerzo),
      horaSalida: parseTime(data.horaSalida),
      esManual: true,
      notas: data.notas,
    },
  });

  return NextResponse.json({ record: updated });
}
