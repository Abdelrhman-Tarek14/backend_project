/**
 * Utility to convert localized Google Sheets timestamps (Africa/Cairo) to UTC ISO-8601 strings.
 * Handles DST changes automatically without external libraries using Intl.DateTimeFormat.
 */
export function toCairoISO(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') {
    throw new Error('Emply date string');
  }

  // 1. Parse the localized date string as if it's UTC to get a base Date object.
  const baseDate = new Date(dateStr + ' UTC');
  if (isNaN(baseDate.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }

  // 2. Calculate the offset for this specific date in Cairo.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = fmt.formatToParts(baseDate);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  const cairoDate = new Date(
    Date.UTC(
      parseInt(map.year),
      parseInt(map.month) - 1,
      parseInt(map.day),
      parseInt(map.hour),
      parseInt(map.minute),
      parseInt(map.second)
    )
  );

  // Offset in milliseconds: (Cairo - UTC)
  const offsetMs = cairoDate.getTime() - baseDate.getTime();

  // 3. To get the actual UTC time representing the Cairo wall clock:
  // UTC = WallClock - Offset
  const actualUtcDate = new Date(baseDate.getTime() - offsetMs);

  return actualUtcDate.toISOString();
}
