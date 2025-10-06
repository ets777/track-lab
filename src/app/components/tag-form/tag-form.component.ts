import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonItem, IonLabel, IonInput } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { ValidationErrorDirective } from "src/app/directives/validation-error";
import { CommonModule } from '@angular/common';
import { commaValidator } from 'src/app/validators/comma.validator';

export type TagForm = {
  name: string;
};

@Component({
  selector: 'app-tag-form',
  templateUrl: './tag-form.component.html',
  styleUrls: ['./tag-form.component.scss'],
  imports: [IonLabel, IonItem, IonInput, FormsModule, ReactiveFormsModule, TranslateModule, ValidationErrorDirective, CommonModule, ValidationErrorDirective],
})
export class TagFormComponent implements OnInit {
  public tagForm: ModelFormGroup<TagForm>;

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.tagForm = this.formBuilder.group({
      name: ['', [Validators.required, commaValidator]],
    });
  }

  ngOnInit() { }

  setDefaultData() {
    this.tagForm.patchValue({
      name: '',
    });
  }
}
