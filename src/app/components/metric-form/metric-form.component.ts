import { Component, Input, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { IonItem, IonLabel, IonInput, IonCheckbox, IonSelect, IonSelectOption } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IList } from 'src/app/db/models/list';
import { IMetric } from 'src/app/db/models/metric';
import { ListService } from 'src/app/services/list.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { MetricService } from 'src/app/services/metric.service';
import { ActionMetricService } from 'src/app/services/action-metric.service';
import { TagMetricService } from 'src/app/services/tag-metric.service';
import { ItemMetricService } from 'src/app/services/item-metric.service';
import { IItem } from 'src/app/db/models/item';
import { filterUniqueElements } from 'src/app/functions/item';
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
  term: CommonItem;
};

@Component({
  selector: 'app-metric-form',
  templateUrl: './metric-form.component.html',
  styleUrls: ['./metric-form.component.scss'],
  imports: [IonCheckbox, IonLabel, IonItem, FormsModule, ReactiveFormsModule, TranslateModule, IonInput, IonSelect, IonSelectOption, SelectSearchComponent, ValidationErrorDirective],
})
export class MetricFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private lists: IList[] = [];
  private listService = inject(ListService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private metricService = inject(MetricService);
  private actionMetricService = inject(ActionMetricService);
  private tagMetricService = inject(TagMetricService);
  private itemMetricService = inject(ItemMetricService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);

  @Input() metric?: IMetric;

  public suggestions: Selectable<CommonItem>[] = [];
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
      term: [null as CommonItem | null],
    }, { validators: minMaxValidator() });

    await this.loadSuggestions();

    if (this.metric) {
      const [actionMetrics, tagMetrics, itemMetrics] = await Promise.all([
        this.actionMetricService.getAllWhereEquals('metricId', this.metric.id),
        this.tagMetricService.getAllWhereEquals('metricId', this.metric.id),
        this.itemMetricService.getAllWhereEquals('metricId', this.metric.id),
      ]);
      let term: CommonItem | null = null;
      if (actionMetrics.length > 0) {
        term = this.suggestions.find(s => s.item.type === 'action' && s.item.itemId === actionMetrics[0].actionId)?.item ?? null;
      } else if (tagMetrics.length > 0) {
        term = this.suggestions.find(s => s.item.type === 'tag' && s.item.itemId === tagMetrics[0].tagId)?.item ?? null;
      } else if (itemMetrics.length > 0) {
        term = this.suggestions.find(s => s.item.type !== 'action' && s.item.type !== 'tag' && s.item.itemId === itemMetrics[0].itemId)?.item ?? null;
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

  async loadSuggestions() {
    this.lists = await this.listService.getAll();

    const actions = (await this.actionService.getAllUnhidden())
      .map((action) => ({
        name: action.name,
        type: 'action',
        itemId: action.id,
      } as CommonItem));
    const tags = (await this.tagService.getAllUnhidden())
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
        itemId: tag.id,
      } as CommonItem));
    const items = (await this.itemService.getAllUnhidden())
      .map((item) => ({
        name: item.name,
        type: this.getItemType(item),
        itemId: item.id,
      } as CommonItem));

    const allItems = filterUniqueElements([
      ...actions,
      ...tags,
      ...items,
    ]);

    this.suggestions = allItems.map((item, index) => ({
      num: index,
      title: item.name,
      subtitle: (item.type === 'action' || item.type === 'tag')
        ? this.translate.instant('TK_' + item.type.toUpperCase())
        : this.translate.instant(item.type),
      item,
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

  getItemType(item: IItem) {
    const itemList = this.lists.find(
      (list) => list.id == item.listId,
    );

    return itemList?.name ?? '';
  }
}
