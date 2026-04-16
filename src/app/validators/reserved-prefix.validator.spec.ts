import { FormControl } from '@angular/forms';
import { reservedPrefixValidator } from './reserved-prefix.validator';

describe('reservedPrefixValidator', () => {
  it('should return null for empty value', () => {
    expect(reservedPrefixValidator(new FormControl(''))).toBeNull();
    expect(reservedPrefixValidator(new FormControl(null))).toBeNull();
  });

  it('should return an error when value starts with TK_', () => {
    const result = reservedPrefixValidator(new FormControl('TK_MY_ACTION'));
    expect(result).toEqual({
      reservedPrefix: { message: 'TK_NAME_CANNOT_START_WITH_TK_PREFIX' },
    });
  });

  it('should be case-insensitive — reject tk_ and Tk_', () => {
    expect(reservedPrefixValidator(new FormControl('tk_something'))).not.toBeNull();
    expect(reservedPrefixValidator(new FormControl('Tk_something'))).not.toBeNull();
  });

  it('should return null for a normal name', () => {
    expect(reservedPrefixValidator(new FormControl('Running'))).toBeNull();
    expect(reservedPrefixValidator(new FormControl('My Action'))).toBeNull();
  });

  it('should return null when TK_ appears in the middle of the name', () => {
    expect(reservedPrefixValidator(new FormControl('prefixTK_suffix'))).toBeNull();
  });
});
