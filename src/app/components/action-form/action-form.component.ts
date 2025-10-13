import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonItem, IonLabel, IonInput } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { ValidationErrorDirective } from "src/app/directives/validation-error";
import { CommonModule } from '@angular/common';
import { commaValidator } from 'src/app/validators/comma.validator';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';
import { existingEntityValidator } from 'src/app/validators/existing-entity.validator';
import { db } from 'src/app/db/db';

export type ActionForm = {
  name: string;
  tags: string;
};

@Component({
  selector: 'app-action-form',
  templateUrl: './action-form.component.html',
  styleUrls: ['./action-form.component.scss'],
  imports: [IonLabel, IonItem, IonInput, FormsModule, ReactiveFormsModule, TranslateModule, ValidationErrorDirective, CommonModule, ValidationErrorDirective, TagInputComponent],
})
export class ActionFormComponent implements OnInit {
  public actionForm: ModelFormGroup<ActionForm>;

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.actionForm = this.formBuilder.group({
      name: ['', {
        asyncValidators: [
          existingEntityValidator('actions')
        ],
        validators: [
          Validators.required,
          commaValidator,
        ],
      }],
      tags: [''],
    });
  }

  ngOnInit() {}

  setDefaultData() {
    this.actionForm.patchValue({
      name: '',
      tags: '',
    });
  }
}
