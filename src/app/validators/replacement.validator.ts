import { AbstractControl, ValidationErrors } from '@angular/forms';

export function replacementValidator(currentValue: any) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !currentValue) {
      return null;
    }

    const name = typeof control.value === 'string' ? control.value : control.value.name;

    if (name == currentValue.name) {
      return {
        replacement: {
          message: 'TK_CAN_T_REPLACE_AN_ITEM_WITH_ITSELF',
        },
      };
    }
    
    return null;
  };
}
