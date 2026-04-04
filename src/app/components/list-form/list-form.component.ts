import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonItem, IonLabel, IonInput, IonCheckbox } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IDictionary } from 'src/app/db/models/dictionary';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { ToastService } from 'src/app/services/toast.service';
import { ActionService } from 'src/app/services/action.service';
import { CommonTerm, Selectable } from 'src/app/types/selectable';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';

export type DictionaryForm = {
  name: string;
  isHidden: boolean;
  term: CommonTerm | null;
};

@Component({
  selector: 'app-dictionary-form',
  templateUrl: './dictionary-form.component.html',
  styleUrls: ['./dictionary-form.component.scss'],
  imports: [IonCheckbox, IonInput, TranslateModule, IonLabel, IonItem, FormsModule, ReactiveFormsModule, SelectSearchComponent, ValidationErrorDirective],
})
export class DictionaryFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private actionService = inject(ActionService);

  public dictionaryForm!: ModelFormGroup<DictionaryForm>;
  public suggestions: Selectable<CommonTerm>[] = [];

  @Input() dictionary?: IDictionary;

  constructor() { }

  async ngOnInit() {
    this.dictionaryForm = this.formBuilder.group({
      name: ['', Validators.required],
      isHidden: [false],
      term: [null as CommonTerm | null],
    });

    await this.loadSuggestions();

    if (this.dictionary) {
      this.setDictionaryData(this.dictionary);
    } else {
      this.setDefaultData();
    }
  }

  async loadSuggestions() {
    const actions = await this.actionService.getAllUnhidden();
    this.suggestions = actions.map((action, index) => ({
      num: index,
      title: action.name,
      subtitle: this.translate.instant('TK_ACTION'),
      item: { name: action.name, type: 'action', termId: action.id } as CommonTerm,
    }));
  }

  async setTermByActionId(actionId: number) {
    if (!this.suggestions.length) {
      await this.loadSuggestions();
    }
    const term = this.suggestions.find(s => s.item.type === 'action' && s.item.termId === actionId)?.item ?? null;
    this.dictionaryForm.patchValue({ term });
  }

  setDefaultData() {
    this.dictionaryForm.patchValue({
      name: '',
      isHidden: false,
      term: null,
    });
  }

  setDictionaryData(dictionary: IDictionary) {
    this.dictionaryForm.patchValue({
      name: dictionary.isBase
        ? this.translate.instant(dictionary.name)
        : dictionary.name,
      isHidden: dictionary.isHidden ?? false,
    });
  }

  onNameClick() {
    if (!this.dictionary?.isBase) return;

    this.toastService.enqueue({
      title: 'TK_DICTIONARY_NAME_CANNOT_BE_CHANGED',
      type: 'error',
    });
  }
}
