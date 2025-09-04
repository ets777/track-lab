import { AbstractControl, ValidationErrors } from '@angular/forms';

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

function isDateValid(date: string) {
    const dateObject = new Date(date);
    const [y, m, d] = date.split('-').map(Number);

    return dateObject.getFullYear() === y
        && dateObject.getMonth() + 1 === m
        && dateObject.getDate() === d
}