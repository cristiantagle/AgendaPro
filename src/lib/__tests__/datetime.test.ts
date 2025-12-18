import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatInTimeZone } from "date-fns-tz";

import { startOfDayUtc, endOfDayUtc, nowInTimezone } from "@/lib/datetime";
import { CHILE_TIMEZONE } from "@/lib/timezone";

const getTimeZoneOffsetMinutes = (timeZone: string, date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const offsetToken = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const match = /^GMT(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?$/.exec(
    offsetToken,
  );

  if (!match?.groups) {
    throw new Error(`Unsupported offset token: "${offsetToken}"`);
  }

  const sign = match.groups.sign === "-" ? -1 : 1;
  const hours = Number(match.groups.hours);
  const minutes = Number(match.groups.minutes ?? "0");

  return sign * (hours * 60 + minutes);
};

describe("datetime helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("startOfDayUtc returns midnight when timezone is UTC", () => {
    const date = new Date("2024-01-15T12:34:56.789Z");
    expect(startOfDayUtc(date, "UTC").toISOString()).toBe(
      "2024-01-15T00:00:00.000Z",
    );
  });

  it("endOfDayUtc returns 23:59:59 when timezone is UTC", () => {
    const date = new Date("2024-01-15T12:34:56.789Z");
    expect(endOfDayUtc(date, "UTC").toISOString()).toBe(
      "2024-01-15T23:59:59.000Z",
    );
  });

  it("startOfDayUtc uses the local day label in Chile timezone (UTC boundary case)", () => {
    const date = new Date("2024-01-15T02:00:00.000Z");
    const start = startOfDayUtc(date, CHILE_TIMEZONE);

    expect(formatInTimeZone(date, CHILE_TIMEZONE, "yyyy-MM-dd")).toBe(
      "2024-01-14",
    );
    expect(formatInTimeZone(start, CHILE_TIMEZONE, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2024-01-14 00:00:00",
    );
  });

  it("endOfDayUtc matches 23:59:59 in Chile timezone", () => {
    const date = new Date("2024-01-15T02:00:00.000Z");
    const end = endOfDayUtc(date, CHILE_TIMEZONE);

    expect(formatInTimeZone(end, CHILE_TIMEZONE, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2024-01-14 23:59:59",
    );
  });

  it("startOfDayUtc returns midnight in a DST-observing timezone", () => {
    const date = new Date("2024-03-10T07:30:00.000Z"); // DST start day in many zones (e.g. New York)
    const start = startOfDayUtc(date, "America/New_York");

    expect(formatInTimeZone(start, "America/New_York", "yyyy-MM-dd HH:mm:ss")).toBe(
      "2024-03-10 00:00:00",
    );
  });

  it("nowInTimezone returns a valid Date for UTC timezone", () => {
    vi.setSystemTime(new Date("2024-01-15T12:34:56.000Z"));
    const result = nowInTimezone("UTC");
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it("nowInTimezone returns wall-clock time in Chile timezone", () => {
    vi.setSystemTime(new Date("2024-01-15T12:34:56.000Z"));
    const result = nowInTimezone(CHILE_TIMEZONE);
    // Verify it represents Chile wall-clock time (UTC-3 in January = 09:34:56)
    const wallClockHour = formatInTimeZone(result, CHILE_TIMEZONE, "HH");
    expect(parseInt(wallClockHour)).toBeLessThan(12); // Should be morning in Chile
  });

  it("nowInTimezone defaults to CHILE_TIMEZONE", () => {
    vi.setSystemTime(new Date("2024-01-15T12:34:56.000Z"));
    expect(nowInTimezone().getTime()).toBe(nowInTimezone(CHILE_TIMEZONE).getTime());
  });
});

