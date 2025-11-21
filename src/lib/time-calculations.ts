import type {
  Company,
  CompanyPaySetting,
  CompanyWorkSchedule,
  Employee,
  TimeRecord,
} from "@/types/database";
import { toZonedTime } from "date-fns-tz";

import { findScheduleForDay, getScheduleBoundaries } from "./schedules";
import { CHILE_TIMEZONE } from "./timezone";
import { APP_CONFIG } from "./config";

const {
  LUNCH_BREAK_HOURS,
  HOURS_MON_TO_THU,
  HOURS_FRIDAY,
  WEEKDAY_LIMIT,
  WEEKEND_RANGES,
} = APP_CONFIG.timeTracking;

type HourTotals = {
  horasNormales: number;
  horasExtra: number;
  horasFindeNormales: number;
  horasFindeExtra: number;
};

export type DaySummary = HourTotals & {
  fecha: string;
  montoNormal: number;
  montoExtra: number;
  montoFindeNormal: number;
  montoFindeExtra: number;
  montoTotalDia: number;
};

export type MonthlySummary = HourTotals & {
  diasTrabajados: number;
  montoTotal: number;
  montoBruto?: number;
  montoNeto?: number;
  totalAdelantos?: number;
  totalDeducciones?: number;
  payments?: Array<{
    fecha: string;
    amount: number;
    type: string;
    note?: string | null;
  }>;
  montoNormalSemana: number;
  montoExtraSemana: number;
  montoFinde: number;
  montoFindeExtra: number;
  dias: DaySummary[];
  company: Pick<Company, "name" | "emailContacto" | "telefonoContacto">;
  employee: Pick<Employee, "nombreCompleto">;
  month: number;
  year: number;
};

const toHourFloat = (date: Date) =>
  date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

const toNumber = (value?: { toNumber: () => number } | number | null) => {
  if (!value && value !== 0) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
};

const getContractHoursForMonth = (month: number, year: number) => {
  const start = new Date(year, month - 1, 1);
  let hours = 0;
  for (
    let date = new Date(start);
    date.getMonth() === start.getMonth();
    date.setDate(date.getDate() + 1)
  ) {
    const day = date.getDay();
    if (day >= 1 && day <= 4) {
      hours += HOURS_MON_TO_THU;
    } else if (day === 5) {
      hours += HOURS_FRIDAY;
    }
  }
  return hours;
};

const deriveHourlyRate = (
  employee: Employee,
  paySettings: CompanyPaySetting,
  month: number,
  year: number,
) => {
  const salary =
    toNumber(employee.sueldoMensual) ||
    toNumber(paySettings.sueldoMensualBase);
  const contractHours = getContractHoursForMonth(month, year);
  if (salary > 0 && contractHours > 0) {
    return salary / contractHours;
  }
  if (toNumber(employee.valorHoraBase) > 0) {
    return toNumber(employee.valorHoraBase);
  }
  return toNumber(paySettings.valorHoraBaseGlobal);
};

const subtractLunchFromSegments = (normal: number, extra: number) => {
  let remaining = LUNCH_BREAK_HOURS;
  let normalHours = normal;
  let extraHours = extra;

  if (normalHours >= remaining) {
    normalHours -= remaining;
    remaining = 0;
  } else {
    remaining -= normalHours;
    normalHours = 0;
  }

  if (remaining > 0) {
    extraHours = Math.max(extraHours - remaining, 0);
    remaining = 0;
  }

  return {
    normalHours: Math.max(normalHours, 0),
    extraHours: Math.max(extraHours, 0),
  };
};

const calculateWeekdayHours = (
  dayOfWeek: number,
  record: TimeRecord,
  entradaOverride?: Date | null,
): { horasNormales: number; horasExtra: number } => {
  const entrada = entradaOverride ?? record.horaEntrada;
  if (!entrada || !record.horaSalida) {
    return { horasNormales: 0, horasExtra: 0 };
  }

  const workedHours =
    (record.horaSalida.getTime() - entrada.getTime()) / 3_600_000;
  const paidHours = Math.max(workedHours - LUNCH_BREAK_HOURS, 0);
  const limit =
    dayOfWeek === 5 ? WEEKDAY_LIMIT.friday : WEEKDAY_LIMIT.default;

  const horasNormales = Math.min(paidHours, limit);
  const horasExtra = Math.max(paidHours - limit, 0);

  return { horasNormales, horasExtra };
};

const calculateWeekendHours = (
  timezone: string,
  record: TimeRecord,
  entradaOverride?: Date | null,
) => {
  const entradaSource = entradaOverride ?? record.horaEntrada;
  if (!entradaSource || !record.horaSalida) {
    return { horasFindeNormales: 0, horasFindeExtra: 0 };
  }

  const entrada = toZonedTime(entradaSource, timezone);
  const salida = toZonedTime(record.horaSalida, timezone);

  const startHour = toHourFloat(entrada);
  const endHour = toHourFloat(salida);

  const normalRangeStart = WEEKEND_RANGES.start;
  const normalRangeEnd = WEEKEND_RANGES.end;

  const normalOverlap = Math.max(
    0,
    Math.min(endHour, normalRangeEnd) - Math.max(startHour, normalRangeStart),
  );

  const extraBefore = Math.max(
    0,
    Math.min(normalRangeStart, endHour) - startHour,
  );
  const extraAfter = Math.max(
    0,
    endHour - Math.max(startHour, normalRangeEnd),
  );
  const rawExtra = extraBefore + extraAfter;

  const { normalHours, extraHours } = subtractLunchFromSegments(
    normalOverlap,
    rawExtra,
  );

  return {
    horasFindeNormales: normalHours,
    horasFindeExtra: extraHours,
  };
};

export const calculateDaySummary = (
  record: TimeRecord,
  employee: Employee,
  company: Company & { schedules?: CompanyWorkSchedule[] },
  paySettings: CompanyPaySetting,
  valorHora: number,
): DaySummary => {
  const timezone = CHILE_TIMEZONE;
  const dateLocal = toZonedTime(record.fecha, timezone);
  const dayOfWeek = dateLocal.getDay();
  const schedule = findScheduleForDay(company.schedules ?? [], dayOfWeek);
  const scheduleBounds = getScheduleBoundaries(
    record.fecha,
    timezone,
    schedule ?? null,
  );
  const effectiveEntrada =
    record.horaEntrada && scheduleBounds
      ? new Date(
        Math.max(
          record.horaEntrada.getTime(),
          scheduleBounds.startUtc.getTime(),
        ),
      )
      : record.horaEntrada ?? null;

  let horasNormales = 0;
  let horasExtra = 0;
  let horasFindeNormales = 0;
  let horasFindeExtra = 0;

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const weekendTotals = calculateWeekendHours(
      timezone,
      record,
      effectiveEntrada,
    );
    horasFindeNormales = weekendTotals.horasFindeNormales;
    horasFindeExtra = weekendTotals.horasFindeExtra;
  } else {
    const weekdayTotals = calculateWeekdayHours(
      dayOfWeek,
      record,
      effectiveEntrada,
    );
    horasNormales = weekdayTotals.horasNormales;
    horasExtra = weekdayTotals.horasExtra;
  }

  const montoNormal = horasNormales * valorHora;
  const montoExtra =
    horasExtra * valorHora * paySettings.factorExtraSemana;
  const weekendDayRate = toNumber(paySettings.weekendDayRate);
  const weekendExtraHourRate = toNumber(paySettings.weekendExtraHourRate);
  const workedWeekendDay = horasFindeNormales > 0;
  const montoFindeNormal = workedWeekendDay ? weekendDayRate : 0;
  const montoFindeExtra = horasFindeExtra * weekendExtraHourRate;

  return {
    fecha: dateLocal.toISOString().split("T")[0],
    horasNormales,
    horasExtra,
    horasFindeNormales,
    horasFindeExtra,
    montoNormal,
    montoExtra,
    montoFindeNormal,
    montoFindeExtra,
    montoTotalDia:
      montoNormal + montoExtra + montoFindeNormal + montoFindeExtra,
  };
};

export const buildMonthlySummary = (
  records: TimeRecord[],
  employee: Employee,
  company: Company & { schedules?: CompanyWorkSchedule[] },
  paySettings: CompanyPaySetting,
  month: number,
  year: number,
  totalAdelantos = 0,
  payments: MonthlySummary["payments"] = [],
): MonthlySummary => {
  const valorHora = deriveHourlyRate(employee, paySettings, month, year);
  const dias = records.map((record) =>
    calculateDaySummary(
      record,
      employee,
      company,
      paySettings,
      valorHora,
    ),
  );

  const totals = dias.reduce(
    (acc, day) => {
      acc.horasNormales += day.horasNormales;
      acc.horasExtra += day.horasExtra;
      acc.horasFindeNormales += day.horasFindeNormales;
      acc.horasFindeExtra += day.horasFindeExtra;
      acc.montoNormalSemana += day.montoNormal;
      acc.montoExtraSemana += day.montoExtra;
      acc.montoFinde += day.montoFindeNormal;
      acc.montoFindeExtra += day.montoFindeExtra;
      acc.montoTotal += day.montoTotalDia;
      acc.diasTrabajados += 1;
      return acc;
    },
    {
      horasNormales: 0,
      horasExtra: 0,
      horasFindeNormales: 0,
      horasFindeExtra: 0,
      montoNormalSemana: 0,
      montoExtraSemana: 0,
      montoFinde: 0,
      montoFindeExtra: 0,
      montoTotal: 0,
      diasTrabajados: 0,
    },
  );

  const montoBruto = totals.montoTotal;
  const adelantosAplicados = Math.max(totalAdelantos, 0);
  const montoNeto = Math.max(montoBruto - adelantosAplicados, 0);

  return {
    ...totals,
    montoTotal: montoNeto,
    montoBruto,
    montoNeto,
    totalAdelantos: adelantosAplicados,
    totalDeducciones: adelantosAplicados,
    dias,
    company: {
      name: company.name,
      emailContacto: company.emailContacto ?? "",
      telefonoContacto: company.telefonoContacto ?? "",
    },
    payments,
    employee: {
      nombreCompleto: employee.nombreCompleto,
    },
    month,
    year,
  };
};
