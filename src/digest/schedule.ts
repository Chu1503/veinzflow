import { calendarDaysElapsed } from "@/lib/dates";
export function isDigestDue(
  lastSuccessful: string | null,
  now: Date,
  timezone: string,
): boolean {
  if (!lastSuccessful) return true;
  const previous = new Date(lastSuccessful);
  return (
    Number.isFinite(previous.getTime()) &&
    calendarDaysElapsed(previous, now, timezone) >= 2
  );
}
