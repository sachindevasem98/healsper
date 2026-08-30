export function dayBoundsUtc(tz?: string): { start: Date; end: Date } {
  const now = new Date();

  if (!tz) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour") % 24;
  const minute = get("minute");
  const second = get("second");

  // Offset between the zoned wall-clock (reinterpreted as UTC) and UTC "now".
  const offsetMs = Date.UTC(year, month - 1, day, hour, minute, second) - now.getTime();

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}