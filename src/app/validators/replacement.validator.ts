import { AbstractControl, ValidationErrors } from '@angular/forms';

export function replacementValidator(currentValue: any) {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null;
        }
    
        if (control.value.name == currentValue.name) {
            return {
                replacement: {
                    message: 'TK_CAN_T_REPLACE_AN_ITEM_WITH_ITSELF',
                },
            };
        }
    
        return null;
    };
}
