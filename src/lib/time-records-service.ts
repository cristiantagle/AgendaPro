import { toZonedTime } from "date-fns-tz";
import type { z } from "zod";

import { startOfDayUtc } from "./datetime";
import {
  createTimeRecord,
  findTimeRecord,
  updateTimeRecord,
} from "./repos/time-records";
import { getEmployeeCompanyWithSchedules } from "./repos/employees";
import { findScheduleForDay, getScheduleBoundaries } from "./schedules";
import { CHILE_TIMEZONE } from "./timezone";
import { markActionSchema } from "./validation";

export type MarkAction = z.infer<typeof markActionSchema>["action"];

export async function markEmployeeAttendance(
  employeeId: string,
  action: MarkAction,
  options?: { enforceStartCutoff?: boolean },
) {
  const data = await getEmployeeCompanyWithSchedules(employeeId);
  if (!data || !data.company) {
    throw Object.assign(new Error("Empleado no encontrado"), {
      status: 404,
    });
  }
  const { employee, company, schedules } = data;

  const timezone = CHILE_TIMEZONE;
  const now = new Date();
  const nowLocal = toZonedTime(now, timezone);

  const todaysSchedule = findScheduleForDay(
    schedules ?? [],
    nowLocal.getDay(),
  );

  if (
    options?.enforceStartCutoff &&
    action === "entrada" &&
    todaysSchedule
  ) {
    const scheduleBounds = getScheduleBoundaries(
      now,
      timezone,
      todaysSchedule,
    );
    if (scheduleBounds && now.getTime() < scheduleBounds.startUtc.getTime()) {
      const message =
        todaysSchedule.horaInicio.length === 5
          ? `${todaysSchedule.horaInicio} hrs`
          : todaysSchedule.horaInicio;
      throw Object.assign(
        new Error(
          `No puedes marcar antes del inicio de la jornada (${message}).`,
        ),
        { status: 400 },
      );
    }
  }

  const today = startOfDayUtc(now, timezone);

  let record = await findTimeRecord({ employeeId: employee.id, fecha: today });
  if (!record) {
    record = await createTimeRecord({
      employeeId: employee.id,
      companyId: company.id,
      fecha: today,
      esManual: false,
    });
  }

  if (!record) {
    throw new Error("No se pudo crear la marcación");
  }

  const updates: Record<string, Date> = {};
  if (action === "entrada") {
    if (record.horaEntrada) {
      throw Object.assign(new Error("La entrada ya fue registrada."), {
        status: 400,
      });
    }
    updates.horaEntrada = now;
  } else if (action === "inicio_almuerzo") {
    if (!record.horaEntrada) {
      throw Object.assign(
        new Error("Debe registrar la entrada primero."),
        { status: 400 },
      );
    }
    if (record.horaInicioAlmuerzo) {
      throw Object.assign(
        new Error("El inicio de almuerzo ya fue registrado."),
        { status: 400 },
      );
    }
    updates.horaInicioAlmuerzo = now;
  } else if (action === "fin_almuerzo") {
    if (!record.horaInicioAlmuerzo) {
      throw Object.assign(
        new Error("Registre el inicio de almuerzo primero."),
        { status: 400 },
      );
    }
    if (record.horaFinAlmuerzo) {
      throw Object.assign(
        new Error("El fin de almuerzo ya fue registrado."),
        { status: 400 },
      );
    }
    updates.horaFinAlmuerzo = now;
  } else if (action === "salida") {
    if (!record.horaEntrada) {
      throw Object.assign(
        new Error("Debe registrar la entrada primero."),
        { status: 400 },
      );
    }
    if (!record.horaFinAlmuerzo) {
      throw Object.assign(
        new Error("Debe registrar fin de almuerzo antes de la salida."),
        { status: 400 },
      );
    }
    if (record.horaSalida) {
      throw Object.assign(new Error("La salida ya fue registrada."), {
        status: 400,
      });
    }
    updates.horaSalida = now;
  }

  const updated = await updateTimeRecord(record.id, updates);
  return { record: updated ?? record };
}
