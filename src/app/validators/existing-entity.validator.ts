import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import Dexie from 'dexie';
import { db } from 'src/app/db/db';

export function existingEntityValidator(
    tableName: string,
): AsyncValidatorFn {
    return async (control: AbstractControl): Promise<ValidationErrors | null> => {
        const value = control.value?.trim();
        if (!value) {
            return null;
        }

        const table = (db as any)[tableName] as Dexie.Table;
        const existing = await table.where('name')
            .equalsIgnoreCase(value)
            .first();

        return existing 
            ? { entityExists: { message: 'TK_THE_ITEM_WITH_THIS_NAME_ALREADY_EXISTS' } } 
            : null;
    };
}