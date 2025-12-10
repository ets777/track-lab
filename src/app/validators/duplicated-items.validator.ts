import { AbstractControl, ValidationErrors } from '@angular/forms';

export function duplicatedItemsValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  const items = control.value.split(',').map((item: string) => item.trim());

  if ([...new Set(items)].length !== items.length) {
    return {
      dateFormat: {
        message: 'TK_DUPLICATE_ITEMS_ARE_NOT_ALLOWED',
      },
    };
  }

  return null;
}
