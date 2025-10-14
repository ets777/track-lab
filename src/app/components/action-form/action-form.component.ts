import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonItem, IonLabel, IonInput } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { ValidationErrorDirective } from "src/app/directives/validation-error";
import { CommonModule } from '@angular/common';
import { commaValidator } from 'src/app/validators/comma.validator';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { IAction } from 'src/app/db/models/action';
import { entitiesToString } from 'src/app/functions/string';

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
  @Input() action?: IAction;

  public actionForm!: ModelFormGroup<ActionForm>;

  constructor(
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.actionForm = this.formBuilder.group({
      name: ['', {
        asyncValidators: [
          existingEntityValidator('actions', this.action?.name)
        ],
        validators: [
          Validators.required,
          commaValidator,
        ],
      }],
      tags: [''],
    });

    if (this.action) {
      this.setActionData(this.action);
    } else {
      this.setDefaultData();
    }
  }

  setDefaultData() {
    this.actionForm.patchValue({
      name: '',
      tags: '',
    });
  }

  setActionData(action: IAction) {
    this.actionForm.patchValue({
      name: action.name,
      tags: entitiesToString(action.tags),
    });
  }
}
