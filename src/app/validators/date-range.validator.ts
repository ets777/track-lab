import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isDateValid } from '../functions/date';

export function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;

  const resetErrors = () => {
    if (control.get('startDate')?.hasError('dateRange')) {
      removeControlError(control.get('startDate')!, 'dateRange');
    }
    if (control.get('endDate')?.hasError('dateRange')) {
      removeControlError(control.get('endDate')!, 'dateRange');
    }
  };

  if (!isDateValid(start) || !isDateValid(end)) {
    resetErrors();
    return null;
  }

  if (start > end) {
    addControlError(
      control.get('startDate')!,
      'dateRange',
      { message: 'TK_DATE_FROM_MUST_NOT_BE_LATER_THAN_DATE_TO' },
    );
    addControlError(
      control.get('endDate')!,
      'dateRange',
      { message: 'TK_DATE_TO_MUST_NOT_BE_EARLIER_THAN_DATE_FROM' },
    );

    return { dateRange: true };
  }

  resetErrors();

  return null;
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
