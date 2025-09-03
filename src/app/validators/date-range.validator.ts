import { AbstractControl, ValidationErrors } from '@angular/forms';

export function dateRangeValidator(formGroup: AbstractControl): ValidationErrors | null {
    const start = formGroup.get('startDate')?.value;
    const end = formGroup.get('endDate')?.value;

    if (!start || !end) {
        return null;
    }

    if (start > end) {
        addControlError(
            formGroup.get('startDate')!, 
            'dateRange', 
            { message: 'Start Date must not be later than End Date.' },
        );
        addControlError(
            formGroup.get('endDate')!, 
            'dateRange', 
            { message: 'End Date must not be earlier than Start Date.' },
        );

        return { dateRange: true };
    }

    if (formGroup.get('startDate')?.hasError('dateRange')) {
        removeControlError(formGroup.get('startDate')!, 'dateRange');
    }
    if (formGroup.get('endDate')?.hasError('dateRange')) {
        removeControlError(formGroup.get('endDate')!, 'dateRange');
    }

    return null;
}

function addControlError(control: AbstractControl, errorKey: string, errorValue: any = true) {
    const currentErrors = control.errors || {};
    control.setErrors({ ...currentErrors, [errorKey]: errorValue });
}

function removeControlError(control: AbstractControl, errorKey: string) {
    if (!control.errors) return;

    const { [errorKey]: removed, ...rest } = control.errors;
    control.setErrors(Object.keys(rest).length ? rest : null);
}