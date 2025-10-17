import { AbstractControl, ValidationErrors } from '@angular/forms';

export function tagValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
        return null;
    }

    const regex = /^[A-Za-zА-Яа-я0-9_-]+$/;

    if (!regex.test(control.value)) {
        return {
            comma: {
                message: 'TK_TAGS_CAN_ONLY_CONTAIN_LETTERS_DIGITS_HYPHENS_AND_UNDERSCORES',
            },
        };
    }

    return null;
}
