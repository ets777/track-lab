import { AbstractControl, ValidationErrors } from '@angular/forms';

export function tagsValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
        return null;
    }

    const items = control.value.split(',').map((item: string) => item.trim());
    const regex = /^[A-Za-zА-Яа-я0-9_-]+$/;

    for (const item of items) {
        if (!regex.test(item)) {
            return {
                comma: {
                    message: 'TK_TAGS_CAN_ONLY_CONTAIN_LETTERS_DIGITS_HYPHENS_AND_UNDERSCORES',
                },
            };
        }
    }

    return null;
}
