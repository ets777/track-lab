import { AbstractControl, ValidationErrors } from '@angular/forms';

export function commaValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
        return null;
    }

    if (control.value.includes(',')) {
        return {
            comma: {
                message: 'TK_COMMAS_ARE_NOT_ALLOWED',
            },
        };
    }

    return null;
}
