import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonItem, IonLabel, IonInput } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { IDictionary } from 'src/app/db/models/dictionary';
import { ModelFormGroup } from 'src/app/types/model-form-group';

export type DictionaryForm = {
  name: string;
};

@Component({
  selector: 'app-dictionary-form',
  templateUrl: './dictionary-form.component.html',
  styleUrls: ['./dictionary-form.component.scss'],
  imports: [IonInput, TranslateModule, IonLabel, IonItem, FormsModule, ReactiveFormsModule],
})
export class DictionaryFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  public dictionaryForm!: ModelFormGroup<DictionaryForm>;

  @Input() dictionary?: IDictionary;

  constructor() { }

  ngOnInit() {
    this.dictionaryForm = this.formBuilder.group({
      name: ['', Validators.required],
    });

    if (this.dictionary) {
      this.setDictionaryData(this.dictionary);
    } else {
      this.setDefaultData();
    }
  }

  setDefaultData() {
    this.dictionaryForm.patchValue({
      name: '',
    });
  }

  setDictionaryData(dictionary: IDictionary) {
    this.dictionaryForm.patchValue({
      name: dictionary.name,
    });
  }
}
