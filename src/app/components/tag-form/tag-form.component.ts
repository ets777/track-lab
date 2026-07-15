import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonInput, IonCheckbox, IonIcon } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { ITag } from 'src/app/db/models/tag';
import { tagValidator } from 'src/app/validators/tag.validator';
import { reservedPrefixValidator } from 'src/app/validators/reserved-prefix.validator';
import { TagService } from 'src/app/services/tag.service';

export type TagForm = {
  name: string;
  isHidden: boolean;
};

@Component({
  selector: 'app-tag-form',
  templateUrl: './tag-form.component.html',
  styleUrls: ['./tag-form.component.scss'],
  imports: [IonInput, IonCheckbox, IonIcon, FormsModule, ReactiveFormsModule, TranslateModule, CommonModule],
})
export class TagFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private tagService = inject(TagService);
  private translate = inject(TranslateService);

  @Input() tag?: ITag;

  public submitted = false;
  public tagForm!: ModelFormGroup<TagForm>;

  ngOnInit() {
    this.tagForm = this.formBuilder.group({
      name: ['', {
        asyncValidators: [
          existingEntityValidator(this.tagService, this.tag?.name)
        ],
        validators: [
          Validators.required,
          tagValidator,
          reservedPrefixValidator,
        ],
      }],
      isHidden: [false],
    });

    if (this.tag) {
      this.setTagData(this.tag);
    } else {
      this.setDefaultData();
    }
  }

  /** Validate-on-submit: mark submitted, resolve pending async checks, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.tagForm.markAllAsTouched();

    if (this.tagForm.pending) {
      await new Promise<void>((resolve) => {
        const sub = this.tagForm.statusChanges.subscribe((status) => {
          if (status !== 'PENDING') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    }

    return this.tagForm.valid;
  }

  /** Show a field's validation sign only after submit was attempted. */
  showError(name: string): boolean {
    return this.submitted && !!this.tagForm?.get(name)?.invalid;
  }

  /** Translate a single control's errors into user-facing messages. */
  fieldErrors(name: string): string[] {
    return this.messagesFor(this.tagForm?.get(name)?.errors ?? null);
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
    this.tagForm.patchValue({
      name: '',
      isHidden: false,
    });
  }

  setTagData(tag: ITag) {
    this.tagForm.patchValue({
      name: tag.name,
      isHidden: tag.isHidden,
    });
  }
}
