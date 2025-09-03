import { AbstractControl, ValidationErrors } from '@angular/forms';

export function dateFormatValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
        return null;
    }

    const regex = /^\d{4}-\d{2}-\d{2}$/;

    if (!regex.test(control.value)) {
        return {
            dateFormat: {
                message: 'Date must be in format yyyy-mm-dd.',
            },
        };
    }

    const date = new Date(control.value);
    const [y, m, d] = control.value.split('-').map(Number);

    if (
        date.getFullYear() !== y
        || date.getMonth() + 1 !== m
        || date.getDate() !== d
    ) {
        return {
            dateFormat: {
                message: 'Invalid date.',
            },
        };
    }

    return null;
}