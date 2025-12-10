import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isDateValid } from '../functions/date';

export function dateFormatValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;

  if (!regex.test(control.value)) {
    return {
      dateFormat: {
        message: 'TK_DATE_MUST_BE_IN_FORMAT_YYYY_MM_DD',
      },
    };
  }

  if (!isDateValid(control.value)) {
    return {
      dateFormat: {
        message: 'TK_INVALID_DATE',
      },
    };
  }

  return null;
}
