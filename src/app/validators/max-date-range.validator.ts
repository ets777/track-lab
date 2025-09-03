import { AbstractControl, ValidationErrors } from '@angular/forms';
import { differenceInDays } from 'date-fns';

export function maxDateRangeValidator(formGroup: AbstractControl): ValidationErrors | null {
    const maxDaysRange = 31;
    const start = formGroup.get('startDate')?.value;
    const end = formGroup.get('endDate')?.value;

    if (!start || !end) {
        return null;
    }

    const daysDiff = Math.abs(differenceInDays(new Date(start), new Date(end)));

    if (daysDiff > maxDaysRange) {
        const error = {
            message: `Date range must not be bigger than ${maxDaysRange} days (${daysDiff} now).`,
        };

        addControlError(formGroup.get('startDate')!, 'maxDateRange', error);
        addControlError(formGroup.get('endDate')!, 'maxDateRange', error);

        return {
            maxDateRange: error,
        };
    }

    if (formGroup.get('startDate')?.hasError('maxDateRange')) {
        removeControlError(formGroup.get('startDate')!, 'maxDateRange');
    }
    if (formGroup.get('endDate')?.hasError('maxDateRange')) {
        removeControlError(formGroup.get('endDate')!, 'maxDateRange');
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