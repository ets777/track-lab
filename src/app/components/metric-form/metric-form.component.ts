import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { CommonTerm, Selectable } from 'src/app/types/selectable';
import { IonItem, IonLabel, IonInput, IonCheckbox } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IDictionary } from 'src/app/db/models/dictionary';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { TermService } from 'src/app/services/term.service';
import { ITerm } from 'src/app/db/models/term';
import { filterUniqueElements } from 'src/app/functions/term';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';

export type MetricForm = {
  name: string;
  isHidden: boolean;
  unit: string;
  step: number;
  minValue: number;
  maxValue: number;
  term: CommonTerm;
};

@Component({
  selector: 'app-metric-form',
  templateUrl: './metric-form.component.html',
  styleUrls: ['./metric-form.component.scss'],
  imports: [IonCheckbox, IonLabel, IonItem, FormsModule, ReactiveFormsModule, TranslateModule, IonInput, SelectSearchComponent],
})
export class MetricFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private dictionaries: IDictionary[] = [];
  private dictionaryService = inject(DictionaryService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private termService = inject(TermService);
  private translate = inject(TranslateService);
  public suggestions: Selectable<CommonTerm>[] = [];

  public metricForm!: ModelFormGroup<MetricForm>;

  constructor() { }

  async ngOnInit() {
    this.metricForm = this.formBuilder.group({
      name: ['', Validators.required],
      unit: [''],
      step: [1],
      minValue: [0],
      maxValue: [10],
      isHidden: [false],
      term: [null as CommonTerm | null],
    });

    await this.loadSuggestions();
  }

  // TODO: move this code to separate component for terms search
  async loadSuggestions() {
    this.dictionaries = await this.dictionaryService.getAll();

    const actions = (await this.actionService.getAllUnhidden())
      .map((action) => ({
        name: action.name,
        type: 'action',
        termId: action.id,
      } as CommonTerm));
    const tags = (await this.tagService.getAllUnhidden())
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
        termId: tag.id,
      } as CommonTerm));
    const terms = (await this.termService.getAllUnhidden())
      .map((term) => ({
        name: term.name,
        type: this.getTermType(term),
        termId: term.id,
      } as CommonTerm));

    const allTerms = filterUniqueElements([
      ...actions,
      ...tags,
      ...terms,
    ]);

    this.suggestions = allTerms.map((term, index) => ({
      num: index,
      title: term.name,
      // TODO: get dictionary name from dictionaries if type is custom
      subtitle: this.translate.instant('TK_' + term.type.toUpperCase()),
      item: term,
    }));
  }

  getTermType(term: ITerm) {
    const termDictionary = this.dictionaries.find(
      (dictionary) => dictionary.id == term.dictionaryId,
    );

    return termDictionary?.name ?? '';
  }
}
