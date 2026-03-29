import { Component, Input, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { CommonTerm, Selectable } from 'src/app/types/selectable';
import { IonItem, IonLabel, IonInput, IonCheckbox, IonSelect, IonSelectOption } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IDictionary } from 'src/app/db/models/dictionary';
import { IMetric } from 'src/app/db/models/metric';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { TermService } from 'src/app/services/term.service';
import { MetricService } from 'src/app/services/metric.service';
import { ActionMetricService } from 'src/app/services/action-metric.service';
import { TagMetricService } from 'src/app/services/tag-metric.service';
import { ITerm } from 'src/app/db/models/term';
import { filterUniqueElements } from 'src/app/functions/term';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { reservedMetricNameValidator } from 'src/app/validators-async/reserved-metric-name.validator';
import { ToastService } from 'src/app/services/toast.service';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';

function setOrClearError(control: AbstractControl | null, key: string, error: ValidationErrors | null) {
  if (!control) return;
  if (error) {
    control.setErrors({ ...control.errors, ...error });
  } else if (control.hasError(key)) {
    const { [key]: _, ...rest } = control.errors ?? {};
    control.setErrors(Object.keys(rest).length ? rest : null);
  }
}

function minMaxValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const minControl = group.get('minValue');
    const maxControl = group.get('maxValue');
    const stepControl = group.get('step');
    const min = Number(minControl?.value);
    const max = Number(maxControl?.value);
    const step = Number(stepControl?.value);

    const minMaxInvalid = min >= max;
    const minMaxError = minMaxInvalid ? { minMax: { message: 'TK_MIN_VALUE_MUST_BE_LESS_THAN_MAX' } } : null;
    setOrClearError(minControl, 'minMax', minMaxError);
    setOrClearError(maxControl, 'minMax', minMaxError);

    const stepInvalid = !minMaxInvalid && step > (max - min);
    const stepError = stepInvalid ? { stepRange: { message: 'TK_STEP_MUST_NOT_EXCEED_RANGE' } } : null;
    setOrClearError(stepControl, 'stepRange', stepError);

    return null;
  };
}

export type MetricForm = {
  name: string;
  isHidden: boolean;
  unit: string;
  step: number;
  minValue: number;
  maxValue: number;
  showPreviousValue: boolean;
  term: CommonTerm;
};

@Component({
  selector: 'app-metric-form',
  templateUrl: './metric-form.component.html',
  styleUrls: ['./metric-form.component.scss'],
  imports: [IonCheckbox, IonLabel, IonItem, FormsModule, ReactiveFormsModule, TranslateModule, IonInput, IonSelect, IonSelectOption, SelectSearchComponent, ValidationErrorDirective],
})
export class MetricFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private dictionaries: IDictionary[] = [];
  private dictionaryService = inject(DictionaryService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private termService = inject(TermService);
  private metricService = inject(MetricService);
  private actionMetricService = inject(ActionMetricService);
  private tagMetricService = inject(TagMetricService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);

  @Input() metric?: IMetric;

  public suggestions: Selectable<CommonTerm>[] = [];
  public metricForm!: ModelFormGroup<MetricForm>;

  constructor() { }

  async ngOnInit() {
    this.metricForm = this.formBuilder.group({
      name: ['', {
        validators: [Validators.required],
        asyncValidators: [
          existingEntityValidator(this.metricService, this.metric?.name),
          reservedMetricNameValidator(this.metricService, this.metric),
        ],
      }],
      unit: [''],
      step: [1],
      minValue: [0, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      maxValue: [5, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      isHidden: [false],
      showPreviousValue: [false],
      term: [null as CommonTerm | null],
    }, { validators: minMaxValidator() });

    await this.loadSuggestions();

    if (this.metric) {
      const [actionMetrics, tagMetrics] = await Promise.all([
        this.actionMetricService.getAllWhereEquals('metricId', this.metric.id),
        this.tagMetricService.getAllWhereEquals('metricId', this.metric.id),
      ]);
      let term: CommonTerm | null = null;
      if (actionMetrics.length > 0) {
        term = this.suggestions.find(s => s.item.type === 'action' && s.item.termId === actionMetrics[0].actionId)?.item ?? null;
      } else if (tagMetrics.length > 0) {
        term = this.suggestions.find(s => s.item.type === 'tag' && s.item.termId === tagMetrics[0].tagId)?.item ?? null;
      }

      this.metricForm.patchValue({
        name: this.metric.isBase
          ? this.translate.instant(this.metric.name)
          : this.metric.name,
        unit: this.metric.unit ?? '',
        step: this.metric.step,
        minValue: this.metric.minValue,
        maxValue: this.metric.maxValue,
        isHidden: this.metric.isHidden,
        showPreviousValue: this.metric.showPreviousValue ?? false,
        term,
      });
    }
  }

  onNameClick() {
    if (!this.metric?.isBase) return;

    this.toastService.enqueue({
      title: 'TK_METRIC_NAME_CANNOT_BE_CHANGED',
      type: 'error',
    });
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

  setDefaultData() {
    this.metricForm.reset({
      name: '',
      unit: '',
      step: 1,
      minValue: 0,
      maxValue: 10,
      isHidden: false,
      term: null,
    });
  }

  getTermType(term: ITerm) {
    const termDictionary = this.dictionaries.find(
      (dictionary) => dictionary.id == term.dictionaryId,
    );

    return termDictionary?.name ?? '';
  }
}
