import { FormControl, FormGroup } from '@angular/forms';
import { MAX_DATE_RANGE_DAYS, maxDateRangeValidator } from './max-date-range.validator';

function makeGroup(startDate: string, endDate: string) {
  return new FormGroup(
    { startDate: new FormControl(startDate), endDate: new FormControl(endDate) },
    { validators: maxDateRangeValidator(MAX_DATE_RANGE_DAYS) },
  );
}

describe('maxDateRangeValidator', () => {
  it('should return null for a period within the allowed range', () => {
    const group = makeGroup('2024-01-01', '2024-01-07');
    expect(group.errors).toBeNull();
  });

  it('should return null for a period of exactly MAX_DATE_RANGE_DAYS days', () => {
    const group = makeGroup('2024-01-01', '2024-02-01');
    expect(group.errors).toBeNull();
  });

  it('should return an error when the period exceeds MAX_DATE_RANGE_DAYS', () => {
    const group = makeGroup('2024-01-01', '2024-02-02');
    expect(group.errors?.['maxDateRange']).toBeTruthy();
  });

  it('should set the error on both startDate and endDate controls', () => {
    const group = makeGroup('2024-01-01', '2024-04-01');
    expect(group.get('startDate')?.errors?.['maxDateRange']).toBeTruthy();
    expect(group.get('endDate')?.errors?.['maxDateRange']).toBeTruthy();
  });

  it('should clear the error after correcting the range', () => {
    const group = makeGroup('2024-01-01', '2024-04-01');
    expect(group.errors?.['maxDateRange']).toBeTruthy();

    group.patchValue({ endDate: '2024-01-14' });
    expect(group.errors).toBeNull();
    expect(group.get('startDate')?.errors).toBeNull();
    expect(group.get('endDate')?.errors).toBeNull();
  });

  it('should return null when dates are invalid (not attempt to validate)', () => {
    const group = makeGroup('not-a-date', '2024-01-07');
    expect(group.errors).toBeNull();
  });
});

describe('MAX_DATE_RANGE_DAYS', () => {
  it('should be 31', () => {
    expect(MAX_DATE_RANGE_DAYS).toBe(31);
  });
});
