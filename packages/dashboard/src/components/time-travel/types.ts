export type TimeScale =
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "24h"
  | "day"
  | "7d"
  | "week"
  | "30d"
  | "month"
  | "year";

/** Rolling scales shown as buttons */
export const ROLLING_SCALES: TimeScale[] = ["1h", "3h", "6h", "12h"];
/** Calendar scales shown as buttons */
export const CALENDAR_SCALES: TimeScale[] = ["day", "week", "month", "year"];
/** All valid scales (including hidden scrub-transition ones, for localStorage validation) */
export const ALL_SCALES: TimeScale[] = [
  "1h",
  "3h",
  "6h",
  "12h",
  "24h",
  "day",
  "7d",
  "week",
  "30d",
  "month",
  "year",
];

/** Calendar → rolling equivalent (used when scrubbing transitions out of calendar mode) */
export const CALENDAR_SCRUB_MAP: Partial<Record<TimeScale, TimeScale>> = {
  day: "24h",
  week: "7d",
  month: "30d",
};

/** Rolling → calendar equivalent (used when returning to live mode) */
export const SCRUB_CALENDAR_MAP: Partial<Record<TimeScale, TimeScale>> = {
  "24h": "day",
  "7d": "week",
  "30d": "month",
};

export function isCalendarScale(scale: TimeScale): boolean {
  return (
    scale === "day" || scale === "week" || scale === "month" || scale === "year"
  );
}

/** Fixed duration for rolling scales (ms). */
const ROLLING_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export const SCALE_LABELS: Record<TimeScale, string> = {
  "1h": "1 Hour",
  "3h": "3 Hours",
  "6h": "6 Hours",
  "12h": "12 Hours",
  "24h": "24 Hours",
  day: "Day",
  "7d": "7 Days",
  week: "Week",
  "30d": "30 Days",
  month: "Month",
  year: "Year",
};

/** Start of a time window → UTC ISO string. Rolling: d minus duration. Calendar: start of period. */
export function start(scale: TimeScale, d: Date): string {
  const ms = ROLLING_MS[scale];
  if (ms !== undefined) return new Date(d.getTime() - ms).toISOString();
  const y = d.getFullYear(),
    m = d.getMonth(),
    day = d.getDate();
  switch (scale) {
    case "day":
      return new Date(y, m, day).toISOString();
    // In UI we show for week mon-sunday data, But in JS week starts from 0 which is sunday.
    case "week":
      return new Date(
        y,
        m,
        day - (d.getDay() === 0 ? 6 : d.getDay() - 1),
      ).toISOString();
    case "month":
      return new Date(y, m, 1).toISOString();
    case "year":
      return new Date(y, 0, 1).toISOString();
    default:
      return d.toISOString();
  }
}

/** End of a time window → UTC ISO string. Rolling: d itself. Calendar: start of next period. */
export function end(scale: TimeScale, d: Date): string {
  const ms = ROLLING_MS[scale];
  if (ms !== undefined) return d.toISOString();
  const y = d.getFullYear(),
    m = d.getMonth(),
    day = d.getDate();
  switch (scale) {
    case "day":
      return new Date(y, m, day + 1).toISOString();
    case "week":
      return new Date(
        y,
        m,
        day - (d.getDay() === 0 ? 6 : d.getDay() - 1) + 7,
      ).toISOString();
    case "month":
      return new Date(y, m + 1, 1).toISOString();
    case "year":
      return new Date(y + 1, 0, 1).toISOString();
    default:
      return d.toISOString();
  }
}

/** Compute the viewing window for any scale. */
export function getTimeWindow(
  scale: TimeScale,
  referenceTime: number,
): { start: string; end: string } {
  const d = new Date(referenceTime);
  return { start: start(scale, d), end: end(scale, d) };
}

/**
 * Jump to the previous or next period.
 * Rolling: adds/subtracts the scale duration.
 * Calendar: moves to the adjacent calendar period (returns midday to avoid DST issues).
 */
export function jumpScale(
  scale: TimeScale,
  referenceTime: number,
  direction: -1 | 1,
): number {
  const ms = ROLLING_MS[scale];
  if (ms !== undefined) {
    return referenceTime + direction * ms;
  }
  const d = new Date(referenceTime);
  const y = d.getFullYear(),
    m = d.getMonth(),
    day = d.getDate();
  switch (scale) {
    case "day":
      return new Date(y, m, day + direction, 12).getTime();
    case "week":
      return new Date(y, m, day + 7 * direction, 12).getTime();
    case "month":
      return new Date(y, m + direction, Math.min(day, 28), 12).getTime();
    default:
      return new Date(y + direction, m, Math.min(day, 28), 12).getTime();
  }
}

/**
 * Whether to snap to live after a jump.
 * Rolling: if within 60s of now.
 * Calendar: if the target period contains now.
 */
export function shouldSnapToLive(
  scale: TimeScale,
  newReferenceTime: number,
): boolean {
  if (isCalendarScale(scale)) {
    const d = new Date(newReferenceTime);
    const nowIso = new Date().toISOString();
    return nowIso >= start(scale, d) && nowIso < end(scale, d);
  }
  return newReferenceTime >= Date.now() - 60_000;
}
