import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, getSession } from "@/lib/auth";
import { startOfDayUtc } from "@/lib/datetime";
import { deleteTimeRecord, getTimeRecordById, updateTimeRecord } from "@/lib/repos/time-records";
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
  const record = await getTimeRecordById(recordId);

  if (!record || record.companyId !== session.companyId) {
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

  const updated = await updateTimeRecord(record.id, {
    fecha,
    horaEntrada: parseTime(data.horaEntrada),
    horaInicioAlmuerzo: parseTime(data.horaInicioAlmuerzo),
    horaFinAlmuerzo: parseTime(data.horaFinAlmuerzo),
    horaSalida: parseTime(data.horaSalida),
    esManual: true,
    notas: data.notas ?? null,
  });

  return NextResponse.json({ record: updated ?? record });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ recordId: string }> },
) {
  const session = await getSession();
  assertRole(session, ["company_admin"]);

  const { recordId } = paramsSchema.parse(await context.params);
  const record = await getTimeRecordById(recordId);

  if (!record || record.companyId !== session.companyId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await deleteTimeRecord(record.id);

  return NextResponse.json({ success: true });
}
