import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonInput, IonCheckbox, IonIcon } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { commaValidator } from 'src/app/validators/comma.validator';
import { reservedPrefixValidator } from 'src/app/validators/reserved-prefix.validator';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { IAction } from 'src/app/db/models/action';
import { entitiesToString } from 'src/app/functions/string';
import { tagsValidator } from 'src/app/validators/tags.validator';
import { ActionService } from 'src/app/services/action.service';

export type ActionForm = {
  name: string;
  tags: string;
  isHidden: boolean;
};

@Component({
  selector: 'app-action-form',
  templateUrl: './action-form.component.html',
  styleUrls: ['./action-form.component.scss'],
  imports: [IonInput, IonCheckbox, IonIcon, FormsModule, ReactiveFormsModule, TranslateModule, CommonModule, TagInputComponent],
})
export class ActionFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private actionService = inject(ActionService);
  private translate = inject(TranslateService);

  @Input() action?: IAction;

  public submitted = false;
  public actionForm!: ModelFormGroup<ActionForm>;

  ngOnInit() {
    this.actionForm = this.formBuilder.group({
      name: ['', {
        asyncValidators: [
          existingEntityValidator(this.actionService, this.action?.name)
        ],
        validators: [
          Validators.required,
          commaValidator,
          reservedPrefixValidator,
        ],
      }],
      tags: ['', tagsValidator],
      isHidden: [false],
    });

    if (this.action) {
      this.setActionData(this.action);
    } else {
      this.setDefaultData();
    }
  }

  /** Validate-on-submit: mark submitted, resolve pending async checks, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.actionForm.markAllAsTouched();

    if (this.actionForm.pending) {
      await new Promise<void>((resolve) => {
        const sub = this.actionForm.statusChanges.subscribe((status) => {
          if (status !== 'PENDING') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    }

    return this.actionForm.valid;
  }

  /** Show a field's validation sign only after submit was attempted. */
  showError(name: string): boolean {
    return this.submitted && !!this.actionForm?.get(name)?.invalid;
  }

  /** Translate a single control's errors into user-facing messages. */
  fieldErrors(name: string): string[] {
    return this.messagesFor(this.actionForm?.get(name)?.errors ?? null);
  }

  private messagesFor(errors: ValidationErrors | null): string[] {
    if (!errors) return [];

    const messages: string[] = [];
    if (errors['required']) messages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    for (const key of Object.keys(errors)) {
      if (errors[key]?.message) {
        messages.push(this.translate.instant(errors[key].message, errors[key].params));
      }
    }

    return [...new Set(messages)];
  }

  setDefaultData() {
    this.submitted = false;
    this.actionForm.patchValue({
      name: '',
      tags: '',
      isHidden: false,
    });
  }

  setActionData(action: IAction) {
    this.actionForm.patchValue({
      name: action.name,
      tags: entitiesToString(action.tags),
      isHidden: action.isHidden,
    });
  }
}
