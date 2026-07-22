export function dateInTimezone(
  date = new Date(),
  timezone = "America/Chicago",
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function calendarDaysElapsed(
  previous: Date,
  current: Date,
  timezone: string,
): number {
  const key = (value: Date) => dateInTimezone(value, timezone);
  const [py, pm, pd] = key(previous).split("-").map(Number);
  const [cy, cm, cd] = key(current).split("-").map(Number);
  return Math.floor(
    (Date.UTC(cy!, cm! - 1, cd) - Date.UTC(py!, pm! - 1, pd)) / 86_400_000,
  );
}
