import { AbstractControl, ValidationErrors } from '@angular/forms';

export function reservedPrefixValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value;
  if (!value) {
    return null;
  }

  if (value.toUpperCase().startsWith('TK_')) {
    return {
      reservedPrefix: {
        message: 'TK_NAME_CANNOT_START_WITH_TK_PREFIX',
      },
    };
  }

  return null;
}
