import { AfterViewInit, Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { IonItem, IonLabel, IonList, IonText, IonInput } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivityService } from 'src/app/services/activity.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Time } from 'src/app/Time';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { Router } from '@angular/router';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { DatePeriod } from 'src/app/types/date-period';
import { IMetric } from 'src/app/db/models/metric';
import { getPartIndex } from 'src/app/functions/string';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { LoadingService } from 'src/app/services/loading.service';

const MAX_METRICS = 5;

const maxMetricsValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const parts = (control.value || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  return parts.length > MAX_METRICS
    ? { maxMetrics: { message: 'TK_MAX_METRICS', params: { max: MAX_METRICS } } }
    : null;
};

const duplicateMetricsValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const parts = (control.value || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  return parts.length !== new Set(parts).size
    ? { duplicateMetrics: { message: 'TK_DUPLICATE_METRICS' } }
    : null;
};

interface NormalizedPoint {
  time: string;
  value: number | undefined;
}

@Component({
  selector: 'app-stats-content',
  templateUrl: './stats-content.component.html',
  styleUrl: './stats-content.component.scss',
  imports: [ValidationErrorDirective, IonInput, IonText, IonList, IonLabel, IonItem, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BaseChartDirective, DatePeriodInputComponent],
})
export class StatsContentComponent implements OnInit, AfterViewInit {
  private activityService = inject(ActivityService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);

  @Input() allMetrics: IMetric[] = [];
  @Input() savedPeriod: string | null = null;
  @Input() savedMetrics: string | null = null;
  @Input() initialActivities: IActivity[] = [];
  @Input() initialPeriod: DatePeriod | null = null;

  @ViewChild('metricInput') metricInput!: IonInput;
  metricInputText = '';
  metricInputCaretPosition = 0;
  metricsControl = new FormControl('', [maxMetricsValidator, duplicateMetricsValidator]);
  filteredMetricSuggestions: string[] = [];
  showMetricSuggestions = false;
  private allMetricSuggestions: string[] = [];
  selectedMetrics: IMetric[] = [];

  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
    avgValues: { metric: IMetric, value: number }[],
  }[] = [];

  chartData!: ChartConfiguration<'line'>['data'];
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: false } },
  };
  filterForm: FormGroup;
  private initialized = false;
  private lastLoadedState: string | null = null;
  private loadingData = false;

  constructor() {
    this.filterForm = this.formBuilder.group({
      datePeriod: [],
    });

    this.filterForm.valueChanges.subscribe(async () => {
      if (this.filterForm.valid) {
        await this.loadStats();
      }
    });
  }

  ngOnInit() {
    const visibleMetrics = this.allMetrics.filter(m => !m.isHidden);
    this.allMetricSuggestions = visibleMetrics.map(m => m.name);

    const defaultMetrics = this.savedMetrics ?? visibleMetrics
      .filter(m => m.isBase)
      .slice(0, MAX_METRICS)
      .map(m => this.translate.instant(m.name))
      .join(', ');

    this.metricInputText = defaultMetrics;
    this.metricsControl.setValue(defaultMetrics, { emitEvent: false });
    this.initialized = true;

    if (this.savedPeriod) {
      this.filterForm.patchValue({ datePeriod: JSON.parse(this.savedPeriod) }, { emitEvent: false });
    }

    if (this.initialPeriod) {
      const { startDate, endDate } = this.initialPeriod;
      this.activities = this.initialActivities;
      this.selectedMetrics = this.getSelectedMetrics();
      this.buildChartData(this.initialActivities, startDate, endDate);
      this.lastLoadedState = `${startDate}|${endDate}|${this.metricInputText}`;
    }
  }

  async ngAfterViewInit() {
    // DatePeriodInputComponent emits via valueChanges for preset periods (week/2weeks/month),
    // triggering loadStats automatically. For custom periods it does not emit, so we trigger here.
    if (this.filterForm.valid && !this.lastLoadedState) {
      await this.loadStats();
    }
  }

  getSelectedMetrics(): IMetric[] {
    const names = this.metricInputText
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    return names
      .map(name => this.allMetrics.find(m => this.translate.instant(m.name).toLowerCase() === name))
      .filter((m): m is IMetric => m !== undefined)
      .slice(0, MAX_METRICS);
  }

  async loadStats() {
    const { startDate, endDate } = this.filterForm.value.datePeriod ?? {};

    if (!startDate || !endDate) {
      return;
    }

    const currentState = `${startDate}|${endDate}|${this.metricInputText}`;
    if (currentState === this.lastLoadedState) {
      return;
    }
    this.lastLoadedState = currentState;

    if (this.loadingData) return;
    this.loadingData = true;
    this.loadingService.show('TK_LOADING');
    await new Promise(resolve => setTimeout(resolve));

    try {
      if (this.initialized && this.filterForm.valid && this.metricsControl.valid) {
        localStorage.setItem('stats-date-period', JSON.stringify(this.filterForm.value.datePeriod));
        localStorage.setItem('stats-metrics', this.metricInputText);
      }

      const activities = await this.activityService.getByDate(startDate, endDate);
      this.activities = activities;
      this.selectedMetrics = this.getSelectedMetrics();
      this.buildChartData(activities, startDate, endDate);
    } finally {
      this.loadingData = false;
      this.loadingService.hide();
    }
  }

  private buildChartData(activities: IActivity[], startDate: string, endDate: string) {
    const minValues = this.selectedMetrics.map(m => m.minValue).filter((v): v is number => v != null);
    const maxValues = this.selectedMetrics.map(m => m.maxValue).filter((v): v is number => v != null);
    this.chartOptions = {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          ...(minValues.length ? { min: Math.min(...minValues) } : {}),
          ...(maxValues.length ? { max: Math.max(...maxValues) } : {}),
        },
      },
    };

    const dates = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      .map(d => format(d, 'yyyy-MM-dd'));

    this.activitiesGroupedByDate = dates.map((date) => {
      const activitiesAtDate = activities.filter((activity) => activity.date == date);
      return {
        date,
        activities: activitiesAtDate,
        avgValues: this.selectedMetrics.map(metric => ({
          metric,
          value: this.getAverageValue(this.normalizeWithInterpolation(activitiesAtDate, metric)),
        })),
      };
    });

    if (!this.selectedMetrics.length) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const avg = this.translate.instant('TK_AVG');

    if (dates.length === 1) {
      const datasets = this.selectedMetrics.map(metric => {
        const normalizedData = this.normalizeWithInterpolation(activities, metric);
        return {
          data: normalizedData.map((data) => data.value || 0),
          label: avg + ' ' + this.translate.instant(metric.name),
        };
      });

      this.chartData = {
        labels: this.normalizeWithInterpolation(activities, this.selectedMetrics[0]).map(d => d.time),
        datasets,
      };
    } else {
      const datasets = this.selectedMetrics.map(metric => ({
        data: this.interpolateZeros(this.activitiesGroupedByDate.map(day => {
          const entry = day.avgValues.find(v => v.metric.id === metric.id);
          return entry?.value ?? 0;
        })),
        label: avg + ' ' + this.translate.instant(metric.name),
      }));

      const lastNonNullIdx = datasets.reduce((max, ds) => {
        const idx = ds.data.reduce<number>((last, v, i) => v !== null ? i : last, -1);
        return Math.max(max, idx);
      }, -1);

      const cutoff = lastNonNullIdx >= 0 ? lastNonNullIdx + 1 : dates.length;

      this.chartData = {
        labels: dates.slice(0, cutoff),
        datasets: datasets.map(ds => ({ ...ds, data: ds.data.slice(0, cutoff) })),
      };
    }
  }

  normalizeWithInterpolation(activities: IActivity[], metric: IMetric): NormalizedPoint[] {
    const result: NormalizedPoint[] = [];

    const sorted = [...activities].sort(
      (a, b) => new Time(a.startTime).valueOf() - new Time(b.startTime).valueOf(),
    );

    const first = [...activities].find((activity) =>
      activity.metricRecords.some((record) => record.metricId == metric.id),
    );
    const last = [...activities].reverse().find((activity) =>
      activity.metricRecords.some((record) => record.metricId == metric.id),
    );

    const startHour = new Time(first?.startTime).getHour();
    let lastHour = new Time(last?.startTime).getHour();

    if (startHour > lastHour) {
      lastHour += 24;
    }

    for (let hour = startHour; hour <= lastHour + 1; hour++) {
      const currentTime = new Time(hour % 24, 0, 0);
      const label = currentTime.toString(false);
      const value = this.getInterpolatedValue(sorted, hour, metric);

      result.push({ time: label, value });
    }

    return result;
  }

  getInterpolatedValue(activities: IActivity[], hour: number, metric: IMetric) {
    const currentTime = new Time(hour % 24, 0, 0);
    const currentSeconds = currentTime.getSecond();

    const before = [...activities].reverse().find((activity) =>
      new Time(activity.endTime).getSecond() <= currentSeconds
      && activity.metricRecords.some((record) => record.metricId == metric.id),
    );
    const after = activities.find((activity) =>
      new Time(activity.endTime).getSecond() >= currentSeconds
      && activity.metricRecords.some((record) => record.metricId == metric.id),
    );

    const recordBefore = before?.metricRecords.find((record) => record.metricId == metric.id);
    const recordAfter = after?.metricRecords.find((record) => record.metricId == metric.id);

    let value: number = 0;
    if (
      before && recordBefore
      && after && recordAfter
      && recordBefore.value !== recordAfter.value
    ) {
      const beforeTime = new Time(before.endTime).getSecond();
      const afterTime = new Time(after.endTime).getSecond();
      const ratio = (currentSeconds - beforeTime) / (afterTime - beforeTime);

      value = recordBefore.value + (recordAfter.value - recordBefore.value) * ratio;
    } else if (recordBefore) {
      value = recordBefore.value;
    } else if (recordAfter) {
      value = recordAfter.value;
    } else {
      value = 0;
    }

    return value;
  }

  getTotalAverageValue(metric: IMetric) {
    const daysWithValue = this.activitiesGroupedByDate.filter(day =>
      day.avgValues.some(v => v.metric.id === metric.id && v.value !== 0)
    );

    if (!daysWithValue.length) {
      return 0;
    }

    const sum = daysWithValue.reduce((prev, day) => {
      const entry = day.avgValues.find(v => v.metric.id === metric.id);
      return prev + (entry?.value ?? 0);
    }, 0);

    return sum / daysWithValue.length;
  }

  getAverageValue(normalizedData: NormalizedPoint[]) {
    if (!normalizedData.length) {
      return 0;
    }

    const sum = normalizedData
      .reduce((previousValue, currentValue) => (currentValue.value ?? 0) + previousValue, 0);

    return sum / normalizedData.length;
  }

  interpolateZeros(data: number[]): (number | null)[] {
    const result: (number | null)[] = [...data];

    for (let i = 0; i < result.length; i++) {
      if (result[i] !== 0) continue;

      let leftIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (result[j] !== 0 && result[j] !== null) { leftIdx = j; break; }
      }

      let rightIdx = -1;
      for (let j = i + 1; j < result.length; j++) {
        if (result[j] !== 0 && result[j] !== null) { rightIdx = j; break; }
      }

      if (leftIdx !== -1 && rightIdx !== -1) {
        const left = result[leftIdx] as number;
        const right = result[rightIdx] as number;
        result[i] = left + (right - left) * (i - leftIdx) / (rightIdx - leftIdx);
      } else {
        result[i] = null;
      }
    }

    return result;
  }

  async showError(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      icon: 'warning-outline',
      cssClass: 'tall-toast',
    });
    await toast.present();
  }

  async goToDay(date: string) {
    await this.router.navigate(
      ['/activity'],
      { queryParams: { date } },
    );
  }

  async updateMetricCaretAndText(event: any) {
    const indexBefore = getPartIndex(this.metricInputText, this.metricInputCaretPosition);

    this.metricInputText = event.target.value ?? '';
    const nativeInput = await this.metricInput.getInputElement();
    this.metricInputCaretPosition = nativeInput.selectionStart ?? 0;
    const indexAfter = getPartIndex(this.metricInputText, this.metricInputCaretPosition);

    if (indexBefore !== indexAfter) {
      this.hideMetricSuggestions();
    }
  }

  async onMetricInput(event: any) {
    await this.updateMetricCaretAndText(event);

    const parts = this.metricInputText
      .split(',')
      .map((s: string) => s.toLowerCase().trim());

    const nonEmpty = parts.filter(Boolean);

    this.metricsControl.setValue(this.metricInputText, { emitEvent: false });

    if (this.metricsControl.invalid) {
      this.hideMetricSuggestions();
      return;
    }

    const currentIndex = getPartIndex(this.metricInputText, this.metricInputCaretPosition);
    const current = parts[currentIndex];

    const otherParts = [...parts];
    otherParts.splice(currentIndex, 1);

    if (current.length > 0) {
      this.filteredMetricSuggestions = this.allMetricSuggestions
        .filter(name => {
          const translated = this.translate.instant(name).toLowerCase();
          return translated.includes(current) && !otherParts.includes(translated);
        })
        .slice(0, 5);
      this.showMetricSuggestions = this.filteredMetricSuggestions.length > 0;
    } else {
      this.hideMetricSuggestions();
    }

    const allPartsMatch = nonEmpty.length > 0
      && nonEmpty.length === parts.length
      && nonEmpty.every(part =>
        this.allMetrics.some(m => this.translate.instant(m.name).toLowerCase() === part)
      );

    if (allPartsMatch) {
      await this.loadStats();
    }
  }

  selectMetricSuggestion(suggestion: string) {
    const currentIndex = getPartIndex(this.metricInputText, this.metricInputCaretPosition);
    const parts = this.metricInputText.split(',');

    parts[currentIndex] = ' ' + this.translate.instant(suggestion);
    this.metricInputText = parts.join(',').trim();
    this.metricsControl.setValue(this.metricInputText, { emitEvent: false });

    this.hideMetricSuggestions();
    this.loadStats();
  }

  hasAnyValue(day: { avgValues: { metric: IMetric, value: number }[] }): boolean {
    return day.avgValues.some(entry => entry.value !== 0);
  }

  hideMetricSuggestions() {
    setTimeout(() => (this.showMetricSuggestions = false), 200);
  }
}
