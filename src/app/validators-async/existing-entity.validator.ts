import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { DatabaseService } from '../services/db/database.service';
import { TableName } from '../services/db/types';

export function existingEntityValidator(
    service: DatabaseService<TableName>,
    currentName?: string,
): AsyncValidatorFn {
    return async (control: AbstractControl): Promise<ValidationErrors | null> => {
        const value = control.value?.trim();

        if (!value || currentName && value == currentName) {
            return null;
        }

        const existing = await service.getFirstWhereEqualsIgnoringCase('name', value);

        return existing 
            ? { entityExists: { message: 'TK_THE_ITEM_WITH_THIS_NAME_ALREADY_EXISTS' } } 
            : null;
    };
}