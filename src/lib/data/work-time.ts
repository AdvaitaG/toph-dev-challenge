import "server-only";

// Interpret the employee's wall-clock input in the farm's IANA timezone.
// Reject nonexistent spring-forward times instead of silently shifting them.
export function farmLocalInstant(day: string, time: string, timezone: string): string | null {
  const target = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(target)) return null;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
    const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    if (observed === target) return new Date(instant).toISOString();
    instant += target - observed;
  }
  return null;
}
