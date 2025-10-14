import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonItem, IonLabel, IonInput } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { ValidationErrorDirective } from "src/app/directives/validation-error";
import { CommonModule } from '@angular/common';
import { commaValidator } from 'src/app/validators/comma.validator';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { ITag } from 'src/app/db/models/tag';

export type TagForm = {
  name: string;
};

@Component({
  selector: 'app-tag-form',
  templateUrl: './tag-form.component.html',
  styleUrls: ['./tag-form.component.scss'],
  imports: [IonLabel, IonItem, IonInput, FormsModule, ReactiveFormsModule, TranslateModule, ValidationErrorDirective, CommonModule, ValidationErrorDirective],
})
export class TagFormComponent {
  @Input() tag?: ITag;

  public tagForm!: ModelFormGroup<TagForm>;

  constructor(
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.tagForm = this.formBuilder.group({
      name: ['', {
        asyncValidators: [
          existingEntityValidator('tags', this.tag?.name)
        ],
        validators: [
          Validators.required,
          commaValidator,
        ],
      }],
    });

    if (this.tag) {
      this.setTagData(this.tag);
    } else {
      this.setDefaultData();
    }
  }

  setDefaultData() {
    this.tagForm.patchValue({
      name: '',
    });
  }

  setTagData(tag: ITag) {
    this.tagForm.patchValue({
      name: tag.name,
    });
  }
}
