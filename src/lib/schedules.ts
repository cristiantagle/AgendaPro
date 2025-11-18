import type { CompanyWorkSchedule } from "@/types/database";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { CHILE_TIMEZONE } from "./timezone";

const normalizeTime = (time: string) =>
  time.length === 5 ? `${time}:00` : time;

export const findScheduleForDay = (
  schedules: CompanyWorkSchedule[],
  dayOfWeek: number,
) => schedules.find((schedule) => schedule.diaSemana === dayOfWeek);

export const getScheduleBoundaries = (
  referenceDate: Date,
  timezone = CHILE_TIMEZONE,
  schedule?: CompanyWorkSchedule | null,
) => {
  if (!schedule) return null;

  const dateLabel = formatInTimeZone(referenceDate, timezone, "yyyy-MM-dd");
  const startUtc = fromZonedTime(
    `${dateLabel}T${normalizeTime(schedule.horaInicio)}`,
    timezone,
  );
  const endUtc = fromZonedTime(
    `${dateLabel}T${normalizeTime(schedule.horaFin)}`,
    timezone,
  );

  return { startUtc, endUtc };
};
