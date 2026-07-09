import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { IonInput, IonCheckbox, IonSelect, IonSelectOption, IonBadge, IonIcon } from "@ionic/angular/standalone";
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
import { ListInputComponent, ListInputSuggestion } from 'src/app/form-elements/list-input/list-input.component';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { reservedMetricNameValidator } from 'src/app/validators-async/reserved-metric-name.validator';
import { reservedPrefixValidator } from 'src/app/validators/reserved-prefix.validator';
import { ToastService } from 'src/app/services/toast.service';
import { TooltipService } from 'src/app/services/tooltip.service';

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
  links: string;
};

@Component({
  selector: 'app-metric-form',
  templateUrl: './metric-form.component.html',
  styleUrls: ['./metric-form.component.scss'],
  imports: [IonCheckbox, FormsModule, ReactiveFormsModule, TranslateModule, IonInput, IonSelect, IonSelectOption, IonBadge, IonIcon, ListInputComponent],
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
  private tooltip = inject(TooltipService);

  @Input() metric?: IMetric;
  @Output() validityChange = new EventEmitter<boolean>();

  public suggestions: Selectable<CommonItem>[] = [];
  public linkSuggestions: ListInputSuggestion[] = [];
  public metricForm!: ModelFormGroup<MetricForm>;
  public submitted = false;

  constructor() { }

  async ngOnInit() {
    this.metricForm = this.formBuilder.group({
      name: ['', {
        validators: [Validators.required, reservedPrefixValidator],
        asyncValidators: [
          existingEntityValidator(this.metricService, this.metric?.name),
          reservedMetricNameValidator(this.metricService, this.metric),
        ],
      }],
      unit: [''],
      step: [1],
      minValue: [1, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      maxValue: [10, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      isHidden: [false],
      showPreviousValue: [false],
      links: [''],
    }, { validators: minMaxValidator() });

    await this.loadSuggestions();

    if (this.metric) {
      const [actionMetrics, tagMetrics, itemMetrics] = await Promise.all([
        this.actionMetricService.getAllWhereEquals('metricId', this.metric.id),
        this.tagMetricService.getAllWhereEquals('metricId', this.metric.id),
        this.itemMetricService.getAllWhereEquals('metricId', this.metric.id),
      ]);

      const linkedNames = [
        ...actionMetrics.map((am) => this.findName('action', am.actionId)),
        ...tagMetrics.map((tm) => this.findName('tag', tm.tagId)),
        ...itemMetrics.map((im) => this.findItemName(im.itemId)),
      ].filter((name): name is string => !!name);

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
        links: linkedNames.join(', '),
      });
    }

    this.metricForm.statusChanges.subscribe(status => {
      this.validityChange.emit(status === 'VALID');
    });
    this.validityChange.emit(this.metricForm.valid);
  }

  onNameClick() {
    if (!this.metric?.isBase) return;

    this.toastService.enqueue({
      title: 'TK_METRIC_NAME_CANNOT_BE_CHANGED',
      type: 'error',
    });
  }

  showItemsTip(event: Event) {
    event.preventDefault();
    this.tooltip.show(event, this.translate.instant('TK_METRIC_ITEMS_TIP'));
  }

  /** Validate-on-submit: mark submitted, resolve pending async checks, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.metricForm.markAllAsTouched();

    if (this.metricForm.pending) {
      await new Promise<void>((resolve) => {
        const sub = this.metricForm.statusChanges.subscribe((status) => {
          if (status !== 'PENDING') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    }

    return this.metricForm.valid;
  }

  /** Show a field's validation sign only after submit was attempted. */
  showError(name: string): boolean {
    return this.submitted && !!this.metricForm?.get(name)?.invalid;
  }

  /** Translate a single control's errors into user-facing messages. */
  fieldErrors(name: string): string[] {
    return this.messagesFor(this.metricForm?.get(name)?.errors ?? null);
  }

  /** Combined messages for the min / max / step range block. */
  rangeErrors(): string[] {
    const merged = {
      ...this.metricForm?.get('minValue')?.errors,
      ...this.metricForm?.get('maxValue')?.errors,
      ...this.metricForm?.get('step')?.errors,
    };
    return this.messagesFor(Object.keys(merged).length ? merged : null);
  }

  private messagesFor(errors: ValidationErrors | null): string[] {
    if (!errors) return [];

    const messages: string[] = [];
    if (errors['required']) messages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    if (errors['pattern']) messages.push(this.translate.instant('TK_VALUE_MUST_BE_A_NUMBER'));
    for (const key of Object.keys(errors)) {
      if (errors[key]?.message) {
        messages.push(this.translate.instant(errors[key].message, errors[key].params));
      }
    }

    return [...new Set(messages)];
  }

  /** Resolve the entered comma-separated names back to their linked subjects. */
  getResolvedLinks(): CommonItem[] {
    return (this.metricForm.get('links')?.value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => this.suggestions.find(
        (s) => s.title.toLowerCase() === name.toLowerCase(),
      )?.item)
      .filter((item): item is CommonItem => !!item);
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
    this.linkSuggestions = this.suggestions.map((s) => ({
      name: s.title,
      subtitle: s.subtitle,
    }));
  }

  private findName(type: 'action' | 'tag', itemId: number): string | undefined {
    return this.suggestions.find((s) => s.item.type === type && s.item.itemId === itemId)?.title;
  }

  private findItemName(itemId: number): string | undefined {
    return this.suggestions.find(
      (s) => s.item.type !== 'action' && s.item.type !== 'tag' && s.item.itemId === itemId,
    )?.title;
  }

  setDefaultData() {
    this.submitted = false;
    this.metricForm.reset({
      name: '',
      unit: '',
      step: 1,
      minValue: 1,
      maxValue: 10,
      isHidden: false,
      showPreviousValue: false,
      links: '',
    });
    this.metricForm.markAsUntouched();
  }

  getItemType(item: IItem) {
    const itemList = this.lists.find(
      (list) => list.id == item.listId,
    );

    return itemList?.name ?? '';
  }
}
