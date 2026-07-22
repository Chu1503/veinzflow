import { dateInTimezone } from "@/lib/dates";

export function isDigestScheduledDay(now: Date, timezone: string): boolean {
  const [year, month, day] = dateInTimezone(now, timezone)
    .split("-")
    .map(Number);
  const calendarDay = Math.floor(
    Date.UTC(year!, month! - 1, day!) / 86_400_000,
  );
  return calendarDay % 2 === 0;
}
