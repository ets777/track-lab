import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Time } from '../Time';

export function timeFormatValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
        return null;
    }

    const regex = /^\d{2}:\d{2}$/;

    if (!regex.test(control.value)) {
        return {
            dateFormat: {
                message: 'TK_TIME_MUST_BE_IN_FORMAT_HH_MM',
            },
        };
    }

    if (!Time.isValid(control.value)) {
        return {
            dateFormat: {
                message: 'TK_INVALID_TIME',
            },
        };
    }

    return null;
}
