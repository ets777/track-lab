import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonIcon } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IItem } from 'src/app/db/models/item';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { ItemService } from 'src/app/services/item.service';
import { reservedPrefixValidator } from 'src/app/validators/reserved-prefix.validator';
import { existingItemValidator } from 'src/app/validators-async/existing-item.validator';

export type ItemForm = {
  name: string;
};

@Component({
  selector: 'app-item-form',
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss'],
  imports: [IonInput, IonIcon, TranslateModule, FormsModule, ReactiveFormsModule],
})
export class ItemFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);
  private itemService = inject(ItemService);

  public itemForm!: ModelFormGroup<ItemForm>;
  public submitted = false;

  @Input() item?: IItem;
  @Input() listId!: number;

  ngOnInit() {
    this.itemForm = this.formBuilder.group({
      name: ['', {
        validators: [Validators.required, reservedPrefixValidator],
        asyncValidators: [existingItemValidator(this.itemService, this.listId, this.item?.name)],
      }],
    });

    if (this.item) {
      this.setItemData(this.item);
    }
  }

  get nameControl() {
    return this.itemForm.get('name');
  }

  /** Show validation sign only after submit was attempted. */
  get showNameError(): boolean {
    return this.submitted && !!this.nameControl?.invalid;
  }

  get nameErrors(): string[] {
    const errors = this.nameControl?.errors;
    if (!errors) {
      return [];
    }

    const messages: string[] = [];
    if (errors['required']) {
      messages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    }
    for (const key of Object.keys(errors)) {
      if (errors[key]?.message) {
        messages.push(this.translate.instant(errors[key].message));
      }
    }

    return messages;
  }

  /** Validate-on-submit: mark submitted, resolve pending async checks, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.itemForm.markAllAsTouched();
    this.nameControl?.updateValueAndValidity();

    if (this.itemForm.pending) {
      await new Promise<void>((resolve) => {
        const sub = this.itemForm.statusChanges.subscribe((status) => {
          if (status !== 'PENDING') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    }

    return this.itemForm.valid;
  }

  setItemData(item: IItem) {
    this.itemForm.patchValue({ name: item.name });
  }
}
