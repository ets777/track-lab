import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { differenceInDays } from 'date-fns';
import { isDateValid } from '../functions/date';

export function maxDateRangeValidator(maxDaysRange: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = control.get('startDate')?.value;
    const end = control.get('endDate')?.value;

    const resetErrors = () => {
      if (control.get('startDate')?.hasError('maxDateRange')) {
        removeControlError(control.get('startDate')!, 'maxDateRange');
      }
      if (control.get('endDate')?.hasError('maxDateRange')) {
        removeControlError(control.get('endDate')!, 'maxDateRange');
      }
    };

    if (!isDateValid(start) || !isDateValid(end)) {
      resetErrors();
      return null;
    }

    const daysDiff = Math.abs(differenceInDays(new Date(start), new Date(end)));

    if (daysDiff > maxDaysRange) {
      const error = {
        message: 'TK_DATE_RANGE_MUST_NOT_BE_BIGGER_THAN',
        params: {
          maxDaysRange,
          daysDiff,
        },
      };

      addControlError(control.get('startDate')!, 'maxDateRange', error);
      addControlError(control.get('endDate')!, 'maxDateRange', error);

      return {
        maxDateRange: error,
      };
    }

    resetErrors();

    return null;
  };
}

function addControlError(control: AbstractControl, errorKey: string, errorValue: any = true) {
  const currentErrors = control.errors || {};
  control.setErrors({ ...currentErrors, [errorKey]: errorValue });
}

function removeControlError(control: AbstractControl, errorKey: string) {
  if (!control.errors) return;

  const { [errorKey]: removed, ...rest } = control.errors;
  control.setErrors(Object.keys(rest).length ? rest : null);
}

