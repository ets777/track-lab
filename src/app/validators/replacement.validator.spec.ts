import { FormControl } from '@angular/forms';
import { replacementValidator } from './replacement.validator';

describe('replacementValidator', () => {
  const current = { id: 1, name: 'Running' };

  it('rejects replacing an item with itself', () => {
    const control = new FormControl({ id: 1, name: 'Running' });
    expect(replacementValidator(current)(control)).toEqual({
      replacement: { message: 'TK_CAN_T_REPLACE_AN_ITEM_WITH_ITSELF' },
    });
  });

  it('accepts a different item', () => {
    const control = new FormControl({ id: 2, name: 'Walking' });
    expect(replacementValidator(current)(control)).toBeNull();
  });

  it('stays silent while the field is still empty', () => {
    expect(replacementValidator(current)(new FormControl(null))).toBeNull();
  });

  it('does not throw when the current item has not loaded yet', () => {
    const control = new FormControl({ id: 2, name: 'Walking' });
    expect(replacementValidator(undefined)(control)).toBeNull();
  });
});
