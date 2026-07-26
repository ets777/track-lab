const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a `yyyy-MM-dd` string into a Date at local midnight.
 *
 * `new Date('2026-07-25')` parses as UTC midnight, so in any timezone west of
 * UTC the resulting Date lands on the previous local day. Every subsequent
 * `format()`/`getDate()` then reads one day early. Always build the Date from
 * its parts instead — that is what this helper is for.
 *
 * Returns null when the string is not a well-formed calendar date.
 */
export function parseLocalDate(dateStr: string): Date | null {
  const m = dateStr?.match(ISO_DATE);
  if (!m) return null;

  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d);

  // Rejects overflow like 2026-02-31, which Date silently rolls forward.
  if (
    date.getFullYear() !== y
        || date.getMonth() + 1 !== mo
        || date.getDate() !== d
  ) {
    return null;
  }

  return date;
}

/**
 * Same as `parseLocalDate` but throws instead of returning null. Use where a
 * caller already knows the value is a valid stored date.
 */
export function parseLocalDateOrThrow(dateStr: string): Date {
  const date = parseLocalDate(dateStr);
  if (!date) throw new Error(`Invalid date string: ${dateStr}`);
  return date;
}

/**
 * Format a Date as `yyyy-MM-dd` using its LOCAL calendar day.
 *
 * The counterpart trap to `parseLocalDate`: `toISOString().slice(0, 10)` on a
 * locally-built Date renders the UTC day, which is one day early for any
 * timezone east of UTC once local time passes midnight-minus-offset. Stored
 * dates are local calendar days, so always format them this way.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local calendar day as `yyyy-MM-dd`. */
export function todayLocal(): string {
  return formatLocalDate(new Date());
}

/**
 * Shift a `yyyy-MM-dd` string by whole days, staying on the local calendar.
 * Returns the input unchanged when it is not a well-formed date.
 */
export function addLocalDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Shift a `yyyy-MM-dd` string by whole months, staying on the local calendar.
 * Day-of-month is clamped to the target month's length (Jan 31 + 1 month =
 * Feb 28/29), matching date-fns `addMonths` rather than Date's roll-forward.
 */
export function addLocalMonths(dateStr: string, months: number): string {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return dateStr;

  const day = parsed.getDate();
  const shifted = new Date(parsed.getFullYear(), parsed.getMonth() + months, 1);
  const daysInTargetMonth = new Date(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    0,
  ).getDate();
  shifted.setDate(Math.min(day, daysInTargetMonth));

  return formatLocalDate(shifted);
}

/**
 * Whole calendar days from `from` to `to` (negative when `to` precedes `from`).
 * Computed on calendar days, so DST transitions cannot skew the result.
 */
export function diffLocalDays(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  // Compare at UTC noon of each local calendar day: immune to DST offsets.
  const toUtcNoon = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return Math.round((toUtcNoon(b) - toUtcNoon(a)) / 86400000);
}

/**
 * Every `yyyy-MM-dd` day from `startDate` to `endDate`, both ends inclusive.
 * Capped at `maxDays` entries so a bad range can never spin forever.
 */
export function localDateRange(
  startDate: string,
  endDate: string,
  maxDays: number,
): string[] {
  if (!parseLocalDate(startDate) || !parseLocalDate(endDate)) return [];

  const span = diffLocalDays(startDate, endDate);
  if (span < 0) return [];

  const count = Math.min(span + 1, maxDays);
  return Array.from({ length: count }, (_, i) => addLocalDays(startDate, i));
}

/**
 * Monday of the week containing `dateStr`, as `yyyy-MM-dd`. Returns the input
 * unchanged when it is not a well-formed date.
 */
export function startOfLocalWeek(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const dayOfWeek = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);
  return formatLocalDate(monday);
}

/**
 * Sunday of the week containing `dateStr`, as `yyyy-MM-dd`. Returns the input
 * unchanged when it is not a well-formed date.
 */
export function endOfLocalWeek(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const dayOfWeek = (d.getDay() + 6) % 7;
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + (6 - dayOfWeek));
  return formatLocalDate(sunday);
}

export function formatDisplayDate(dateStr: string, lang: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const options: Intl.DateTimeFormatOptions = d.getFullYear() === new Date().getFullYear()
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return normalizeShortDate(d.toLocaleDateString(lang, options));
}

function normalizeShortDate(s: string): string {
  return s.replace(/\.(?=\s|$)/g, '');
}

export function formatWeekday(dateStr: string, lang: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  return normalizeShortDate(d.toLocaleDateString(lang, { weekday: 'short' }));
}

export function formatGraphDate(dateStr: string, lang: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
}

export function isDateValid(date: string) {
  return parseLocalDate(date) !== null;
}
