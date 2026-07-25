import {
  addLocalDays,
  addLocalMonths,
  diffLocalDays,
  endOfLocalWeek,
  formatLocalDate,
  isDateValid,
  localDateRange,
  parseLocalDate,
  startOfLocalWeek,
} from './date';

/**
 * These helpers exist because `new Date('yyyy-MM-dd')` parses as UTC while
 * `getDate()`/`format()` read local time, so date maths silently shifted by a
 * day in any timezone west of UTC — and `toISOString().slice(0, 10)` shifted
 * the other way for timezones east of it. The suite therefore leans on
 * boundary values where such an offset would show up.
 */
describe('parseLocalDate', () => {
  it('should build the date from its parts, not by UTC parsing', () => {
    const parsed = parseLocalDate('2026-07-25')!;

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(25);
  });

  it('should return null for a malformed string', () => {
    expect(parseLocalDate('2026-7-5')).toBeNull();
    expect(parseLocalDate('not-a-date')).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });

  it('should reject a calendar overflow instead of rolling it forward', () => {
    expect(parseLocalDate('2026-02-31')).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
  });

  it('should accept a real leap day and reject a fake one', () => {
    expect(parseLocalDate('2024-02-29')).not.toBeNull();
    expect(parseLocalDate('2026-02-29')).toBeNull();
  });
});

describe('isDateValid', () => {
  it('should accept a valid date regardless of the local timezone offset', () => {
    expect(isDateValid('2026-07-25')).toBeTrue();
    expect(isDateValid('2026-01-01')).toBeTrue();
    expect(isDateValid('2026-12-31')).toBeTrue();
  });

  it('should reject malformed and impossible dates', () => {
    expect(isDateValid('2026-02-31')).toBeFalse();
    expect(isDateValid('20260725')).toBeFalse();
  });
});

describe('formatLocalDate', () => {
  it('should use the local calendar day, not the UTC one', () => {
    // Late-evening local time is already the next day in UTC for east-of-UTC
    // zones, and still the previous day for west-of-UTC ones.
    expect(formatLocalDate(new Date(2026, 6, 25, 23, 30))).toBe('2026-07-25');
    expect(formatLocalDate(new Date(2026, 6, 25, 0, 30))).toBe('2026-07-25');
  });

  it('should zero-pad month and day', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addLocalDays', () => {
  it('should advance by exactly one calendar day', () => {
    expect(addLocalDays('2026-07-25', 1)).toBe('2026-07-26');
  });

  it('should go backwards', () => {
    expect(addLocalDays('2026-07-25', -1)).toBe('2026-07-24');
  });

  it('should cross month and year boundaries', () => {
    expect(addLocalDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addLocalDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('should return the input unchanged when it is not a date', () => {
    expect(addLocalDays('nonsense', 1)).toBe('nonsense');
  });
});

describe('addLocalMonths', () => {
  it('should shift by whole months', () => {
    expect(addLocalMonths('2026-07-25', 1)).toBe('2026-08-25');
    expect(addLocalMonths('2026-07-25', -1)).toBe('2026-06-25');
  });

  it('should clamp to the end of a shorter target month', () => {
    expect(addLocalMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addLocalMonths('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('should cross year boundaries', () => {
    expect(addLocalMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('diffLocalDays', () => {
  it('should count whole calendar days', () => {
    expect(diffLocalDays('2026-07-25', '2026-08-01')).toBe(7);
  });

  it('should be negative when the range runs backwards', () => {
    expect(diffLocalDays('2026-08-01', '2026-07-25')).toBe(-7);
  });

  it('should be zero for the same day', () => {
    expect(diffLocalDays('2026-07-25', '2026-07-25')).toBe(0);
  });

  it('should not be skewed by a DST transition', () => {
    // US DST starts 2026-03-08; a naive ms/86400000 division rounds badly here.
    expect(diffLocalDays('2026-03-07', '2026-03-09')).toBe(2);
    // ...and ends 2026-11-01.
    expect(diffLocalDays('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('localDateRange', () => {
  it('should include both ends of the range', () => {
    expect(localDateRange('2026-07-25', '2026-07-28', 31)).toEqual([
      '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28',
    ]);
  });

  it('should return a single day when start equals end', () => {
    expect(localDateRange('2026-07-25', '2026-07-25', 31)).toEqual(['2026-07-25']);
  });

  it('should cap the result at maxDays', () => {
    expect(localDateRange('2026-01-01', '2026-12-31', 5).length).toBe(5);
  });

  it('should return nothing for an inverted or invalid range', () => {
    expect(localDateRange('2026-07-28', '2026-07-25', 31)).toEqual([]);
    expect(localDateRange('bad', '2026-07-25', 31)).toEqual([]);
  });
});

describe('week boundaries', () => {
  it('should treat Monday as the start of the week', () => {
    // 2026-07-25 is a Saturday.
    expect(startOfLocalWeek('2026-07-25')).toBe('2026-07-20');
    expect(endOfLocalWeek('2026-07-25')).toBe('2026-07-26');
  });

  it('should be stable when the date is already Monday', () => {
    expect(startOfLocalWeek('2026-07-20')).toBe('2026-07-20');
  });

  it('should be stable when the date is already Sunday', () => {
    expect(endOfLocalWeek('2026-07-26')).toBe('2026-07-26');
  });
});
