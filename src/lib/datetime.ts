import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { CHILE_TIMEZONE } from "./timezone";

export const startOfDayUtc = (date: Date, timezone = CHILE_TIMEZONE) => {
  const dateLabel = formatInTimeZone(date, timezone, "yyyy-MM-dd");
  return fromZonedTime(`${dateLabel}T00:00:00`, timezone);
};

export const endOfDayUtc = (date: Date, timezone = CHILE_TIMEZONE) => {
  const dateLabel = formatInTimeZone(date, timezone, "yyyy-MM-dd");
  return fromZonedTime(`${dateLabel}T23:59:59`, timezone);
};

export const nowInTimezone = (timezone = CHILE_TIMEZONE) =>
  toZonedTime(new Date(), timezone);
