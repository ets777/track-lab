import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonItem, IonLabel, IonInput } from "@ionic/angular/standalone";
import { Selectable, CommonTerm } from 'src/app/types/selectable';
import { TagService } from 'src/app/services/tag.service';
import { ActionService } from 'src/app/services/action.service';
import { TermService } from 'src/app/services/term.service';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { filterUniqueElements } from 'src/app/functions/term';
import { IDictionary } from 'src/app/db/models/dictionary';
import { ITerm } from 'src/app/db/models/term';
import { capitalize } from 'src/app/functions/string';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { maskitoTimeOptionsGenerator } from '@maskito/kit';
import { MaskitoDirective } from '@maskito/angular';

export type StreakForm = {
  term: CommonTerm;
  startDate: string;
};

@Component({
  selector: 'app-streak-form',
  templateUrl: './streak-form.component.html',
  styleUrls: ['./streak-form.component.scss'],
  imports: [IonLabel, IonItem, IonInput, FormsModule, ReactiveFormsModule, TranslateModule, IonItem, SelectSearchComponent, ValidationErrorDirective, MaskitoDirective],
})
export class StreakFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private streakService = inject(StreakService);
  private tagService = inject(TagService);
  private translate = inject(TranslateService);
  private dictionaryService = inject(DictionaryService);
  private actionService = inject(ActionService);
  private termService = inject(TermService);
  private dictionaries: IDictionary[] = [];
  public suggestions: Selectable<CommonTerm>[] = [];

  @Input() streak?: IStreak;

  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();
  protected readonly timeMask: MaskitoOptions = maskitoTimeOptionsGenerator({
    mode: 'HH:MM',
  });

  public streakForm!: ModelFormGroup<StreakForm>;

  async ngOnInit() {
    this.streakForm = this.formBuilder.group({
      startDate: ['', [Validators.required, dateFormatValidator]],
      term: [null as CommonTerm | null, Validators.required],
    });

    await this.loadSuggestions();
  }

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

  getSuggestionSubtitle(term: CommonTerm) {
    if (['action', 'tag'].includes(term.type)) {
      return this.translate.instant('TK_' + term.type.toUpperCase())
    }

    return capitalize(term.type);
  }

  setDefaultData() {
    this.streakForm.patchValue({
      startDate: '',
      term: null,
    });
  }
}
