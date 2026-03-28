import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonTextarea, IonList, IonIcon, IonAccordionGroup, IonAccordion, IonRange, IonCheckbox, IonButton } from '@ionic/angular/standalone';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityMetricService } from 'src/app/services/activity-metric.service';
import { Time } from 'src/app/Time';
import { addDays, format } from 'date-fns';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { MaskitoDirective } from '@maskito/angular';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { maskitoTimeOptionsGenerator } from '@maskito/kit';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';
import { getPartIndex, lowerCaseFirstLetter } from 'src/app/functions/string';
import { actionSuggestions } from './action-suggestions';
import { IActivity } from 'src/app/db/models/activity';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { entitiesToString } from 'src/app/functions/string';
import { ActionService } from 'src/app/services/action.service';
import { MetricService } from 'src/app/services/metric.service';
import { IMetric } from 'src/app/db/models/metric';
import { tagsValidator } from 'src/app/validators/tags.validator';
import { duplicatedItemsValidator } from 'src/app/validators/duplicated-items.validator';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';

function metricRangeValidator(min?: number, max?: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) return { pattern: true };
    if (min !== undefined && num < min) return { minRange: { message: 'TK_VALUE_BELOW_MIN', params: { min } } };
    if (max !== undefined && num > max) return { maxRange: { message: 'TK_VALUE_EXCEEDS_MAX', params: { max } } };
    return null;
  };
}

export type ActivityForm = {
  actions: string,
  startTime: string,
  endTime: string,
  comment: string,
  date: string,
  tags: string,
};

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonButton, IonRange, IonCheckbox, IonAccordion, IonAccordionGroup, IonIcon, IonList, IonTextarea, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective, ValidationErrorDirective, TagInputComponent],
})
export class ActivityFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private activityService = inject(ActivityService);
  private translate = inject(TranslateService);
  private actionService = inject(ActionService);
  private metricService = inject(MetricService);
  private activityMetricService = inject(ActivityMetricService);

  @Input() activity?: IActivity;
  @Input() activityMetricValues?: Record<number, number>;

  @ViewChild('actionsInput') actionInput!: IonInput;
  actionInputCaretPosition = 0;
  actionInputText = '';

  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();
  protected readonly timeMask: MaskitoOptions = maskitoTimeOptionsGenerator({
    mode: 'HH:MM',
  });

  public activityForm: ModelFormGroup<ActivityForm>;
  public metricsForm: FormGroup = this.formBuilder.group({});
  public standaloneMetrics: IMetric[] = [];
  public metricEnabled: Record<string, boolean> = {};

  filteredActionSuggestions: string[] = [];
  private allActionSuggestions = actionSuggestions;
  showActionSuggestions = false;

  private currentTime: string = '00:00';

  constructor() {
    this.activityForm = this.formBuilder.group({
      actions: ['', [Validators.required, duplicatedItemsValidator]],
      startTime: ['', [Validators.required, timeFormatValidator]],
      endTime: ['', timeFormatValidator],
      comment: [''],
      date: ['', [Validators.required, dateFormatValidator]],
      tags: ['', tagsValidator],
    });
    this.setCurrentTime();

    setInterval(() => {
      this.setCurrentTime();
    }, 5000);
  }

  async ngOnInit() {
    await this.fetchAllSuggestions();
    await this.loadStandaloneMetrics();

    if (this.activity) {
      this.setActivityData(this.activity);
    } else {
      await this.setDefaultData();
    }
  }

  isRangeMetric(metric: IMetric): boolean {
    if (metric.minValue == null || metric.maxValue == null || !metric.step) return false;
    return (metric.maxValue - metric.minValue) / metric.step <= 100;
  }

  getRangeColor(metric: IMetric): string {
    const value = this.metricsForm.get(`metric_${metric.id}`)?.value;
    if (value == null || metric.minValue == null || metric.maxValue == null) return '';
    const pct = (value - metric.minValue) / (metric.maxValue - metric.minValue) * 100;
    if (pct < 20) return '#f44336';
    if (pct < 40) return '#ff9800';
    if (pct < 60) return '#e6c200';
    if (pct < 80) return '#8bc34a';
    return '#4caf50';
  }

  async loadStandaloneMetrics() {
    this.standaloneMetrics = await this.metricService.getStandalone();

    const prevValues = await Promise.all(
      this.standaloneMetrics.map(m =>
        m.showPreviousValue ? this.activityMetricService.getLastValue(m.id) : Promise.resolve(null)
      )
    );

    this.metricsForm = this.formBuilder.group({});
    this.metricEnabled = {};

    for (let i = 0; i < this.standaloneMetrics.length; i++) {
      const metric = this.standaloneMetrics[i];
      const isRange = this.isRangeMetric(metric);
      const mid = (metric.minValue! + metric.maxValue!) / 2;
      const midRounded = isRange ? Math.round((mid - metric.minValue!) / metric.step!) * metric.step! + metric.minValue! : null;

      const prev = prevValues[i];
      const existingValue = this.activityMetricValues?.[metric.id] ?? null;
      const defaultValue = existingValue !== null ? existingValue : (prev !== null ? prev : midRounded);

      const validators = isRange ? [] : [metricRangeValidator(metric.minValue, metric.maxValue)];
      this.metricsForm.addControl(`metric_${metric.id}`, this.formBuilder.control(defaultValue, validators));
      this.metricEnabled[`metric_${metric.id}`] = existingValue !== null;
    }
  }

  onRangeChange(metricId: number) {
    this.metricEnabled[`metric_${metricId}`] = true;
  }

  stepMetric(metric: IMetric, direction: 1 | -1) {
    const key = `metric_${metric.id}`;
    const control = this.metricsForm.get(key);
    if (!control) return;
    const current = Number(control.value) || 0;
    const step = metric.step ?? 1;
    let next = Math.round((current + direction * step) / step) * step;
    if (metric.minValue != null) next = Math.max(metric.minValue, next);
    if (metric.maxValue != null) next = Math.min(metric.maxValue, next);
    control.setValue(parseFloat(next.toFixed(10)));
    this.metricEnabled[key] = true;
  }

  onMetricCheckboxChange(metricId: number, event: any) {
    this.metricEnabled[`metric_${metricId}`] = event.detail.checked;
  }

  getMetricRecords(): { metricId: number; value: number }[] {
    return this.standaloneMetrics
      .map((m) => ({
        metricId: m.id,
        value: this.metricsForm.get(`metric_${m.id}`)?.value,
        enabled: this.metricEnabled[`metric_${m.id}`],
      }))
      .filter((r) => r.enabled && r.value !== null && r.value !== undefined && r.value !== '');
  }

  isMetricsFormValid(): boolean {
    return this.metricsForm.valid;
  }

  async fetchAllSuggestions() {
    const actions = await this.actionService.getAllUnhidden();
    this.allActionSuggestions = this.allActionSuggestions.map(
      (suggestion) => lowerCaseFirstLetter(this.translate.instant(suggestion))
    );
    this.allActionSuggestions.unshift(...actions.map((action) => action.name));
    this.allActionSuggestions = [...new Set(this.allActionSuggestions)];
  }

  setCurrentTime() {
    this.currentTime = new Time().toString().slice(0, 5);
  }

  getDefaultData() {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    return {
      actions: '',
      startTime: this.currentTime,
      endTime: this.currentTime,
      comment: '',
      date: currentDate,
      tags: '',
    };
  }

  async setDefaultData() {
    const defaultData = this.getDefaultData();
    const lastActivityData = await this.getLastActivityData();

    this.activityForm.patchValue({
      ...defaultData,
      ...lastActivityData,
    });
    for (const metric of this.standaloneMetrics) {
      if (!this.isRangeMetric(metric) && !metric.showPreviousValue) {
        this.metricsForm.get(`metric_${metric.id}`)?.reset();
      }
    }
  }

  async updateLastActivityData() {
    const lastActivityData = await this.getLastActivityData();

    this.activityForm.patchValue({
      ...lastActivityData,
    });
  }

  async getLastActivityData() {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(addDays(new Date(currentDate), -1), 'yyyy-MM-dd');
    const lastActivity = await this.activityService.getLastEnriched();

    if (!lastActivity) {
      return {};
    }

    let startTime = this.currentTime;
    let date = currentDate;

    if (lastActivity.date == currentDate && lastActivity.endTime) {
      startTime = lastActivity.endTime;
    }

    if (
      lastActivity.date
      && yesterday == lastActivity.date
      && lastActivity.endTime
    ) {
      startTime = lastActivity.endTime;

      if (lastActivity.endTime > lastActivity.startTime) {
        date = lastActivity.date;
      }
    }

    return {
      startTime,
      date,
    };
  }

  setActivityData(activity: IActivity) {
    this.activityForm.patchValue({
      actions: entitiesToString(activity.actions),
      startTime: activity.startTime,
      endTime: activity.endTime,
      comment: activity.comment,
      date: activity.date,
      tags: entitiesToString(activity.tags),
    });
  }

  async updateActionCaretAndText(event: any) {
    const indexBefore = getPartIndex(this.actionInputText, this.actionInputCaretPosition);

    this.actionInputText = event.target.value;
    const nativeInput = await this.actionInput.getInputElement();
    this.actionInputCaretPosition = nativeInput.selectionStart ?? 0;
    const indexAfter = getPartIndex(this.actionInputText, this.actionInputCaretPosition);

    if (indexBefore !== indexAfter) {
      this.hideActionSuggestions();
    }
  }

  async onActionsInput(event: any) {
    await this.updateActionCaretAndText(event);

    const parts = this.actionInputText
      .split(',')
      .map((suggestion: string) => suggestion.toLowerCase().trim());

    const currentIndex = getPartIndex(this.actionInputText, this.actionInputCaretPosition);
    const current = parts[currentIndex];

    parts.splice(currentIndex, 1);

    if (current.length > 0) {
      this.filteredActionSuggestions = this.allActionSuggestions
        .filter((suggestion) =>
          suggestion.toLowerCase().includes(current)
          && !parts.includes(suggestion.toLowerCase())
        )
        .slice(0, 5);
      this.showActionSuggestions = this.filteredActionSuggestions.length > 0;
    } else {
      this.hideActionSuggestions();
    }
  }

  selectSuggestion(suggestion: string) {
    const actionsText = this.activityForm.get('actions')?.value;

    if (!actionsText) {
      return;
    }

    const currentIndex = getPartIndex(actionsText, this.actionInputCaretPosition);
    let parts = actionsText.split(',') ?? [];

    if (!parts.length) {
      return;
    }

    parts[currentIndex] = ' ' + suggestion;
    this.activityForm.patchValue({
      actions: parts.join(',').trim(),
    });

    this.hideActionSuggestions();
  }

  hideActionSuggestions() {
    setTimeout(() => (this.showActionSuggestions = false), 200);
  }

  isCurrentTime(time: string) {
    return this.currentTime == time;
  }

  updateEndTime(event: Event) {
    event.preventDefault();

    this.activityForm.patchValue({
      endTime: this.currentTime,
    });

    this.activityForm.get('endTime')?.markAsUntouched();
  }
}
