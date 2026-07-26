import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ItemService } from '../services/item.service';

/** Duplicate check scoped to a single list (item names are unique per list, not globally). */
export function existingItemValidator(
  service: ItemService,
  listId: number,
  currentName?: string,
): AsyncValidatorFn {
  return async (control: AbstractControl): Promise<ValidationErrors | null> => {
    const value = control.value?.trim();

    if (!value || currentName && value.toLowerCase() === currentName.toLowerCase()) {
      return null;
    }

    const items = await service.getAllWhereEquals('listId', listId);
    const exists = items.some((item) => item.name.toLowerCase() === value.toLowerCase());

    return exists
      ? { entityExists: { message: 'TK_THE_ITEM_WITH_THIS_NAME_ALREADY_EXISTS' } }
      : null;
  };
}
