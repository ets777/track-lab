import { AfterViewInit, Component, HostBinding, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivityService } from 'src/app/services/activity.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BaseChartDirective } from 'ng2-charts';
import { ChartThemeDirective } from 'src/app/directives/chart-theme.directive';
import { ChartConfiguration } from 'chart.js';
import { Time } from 'src/app/Time';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { formatGraphDate } from 'src/app/functions/date';
import { styledLineChartOptions, LINE_DATASET_STYLE, lineDatasetColor } from 'src/app/functions/chart';
import { Router } from '@angular/router';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { DatePeriod } from 'src/app/types/date-period';
import { IMetric } from 'src/app/db/models/metric';
import { LoadingService } from 'src/app/services/loading.service';
import { MetricInputComponent } from 'src/app/form-elements/metric-input/metric-input.component';

const MAX_METRICS = 3;

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
  imports: [IonSegment, IonSegmentButton, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BaseChartDirective, ChartThemeDirective, DatePeriodInputComponent, MetricInputComponent],
})
export class StatsContentComponent implements OnInit, AfterViewInit, OnChanges {
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
  @Input() fixedMetricName?: string;
  @Input() hidePeriodSelector = false;
  @Input() hideCalendar = false;
  @Input() skipLoadingModal = false;
  @Input() fillHeight = false;
  @Input() chartColor?: string;

  @HostBinding('class.fill-height') get isFillHeight() { return this.fillHeight; }

  /** True on the standalone metrics stats page; false when embedded (experiment graph, dashboard widget). Gates the clinical card chrome. */
  get standalone(): boolean {
    return !this.fixedMetricName && !this.fillHeight;
  }

  metricInputText = '';
  metricsControl = new FormControl('', [maxMetricsValidator, duplicateMetricsValidator]);
  selectedMetrics: IMetric[] = [];

  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
    avgValues: { metric: IMetric, value: number | null }[],
  }[] = [];

  chartData!: ChartConfiguration<'line'>['data'];
  chartOptions: ChartConfiguration<'line'>['options'] = styledLineChartOptions();
  filterForm: FormGroup;
  selectedCalendarMetricIndex = 0;
  private initialized = false;
  private lastLoadedState: string | null = null;
  private loadingData = false;

  readonly weekdays = ['TK_CAL_MON', 'TK_CAL_TUE', 'TK_CAL_WED', 'TK_CAL_THU', 'TK_CAL_FRI', 'TK_CAL_SAT', 'TK_CAL_SUN'];

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

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['initialPeriod'] && this.initialPeriod) {
      this.filterForm.patchValue({ datePeriod: this.initialPeriod });
    }
  }

  ngOnInit() {
    if (this.fillHeight) {
      this.chartOptions = styledLineChartOptions({ fillHeight: true });
    }
    const visibleMetrics = this.allMetrics.filter(m => !m.isHidden);

    let defaultMetrics: string;
    if (this.fixedMetricName) {
      defaultMetrics = this.translate.instant(this.fixedMetricName);
    } else {
      defaultMetrics = this.savedMetrics
        ? this.savedMetrics.split(',').map(s => {
            const k = s.trim();
            return k.startsWith('TK_') ? this.translate.instant(k) : k;
          }).join(', ')
        : visibleMetrics
            .filter(m => m.isBase)
            .slice(0, MAX_METRICS)
            .map(m => this.translate.instant(m.name))
            .join(', ');
    }

    this.metricInputText = defaultMetrics;
    this.metricsControl.setValue(defaultMetrics, { emitEvent: false });
    this.initialized = true;

    // Metric chips changed → resync text and reload the chart.
    this.metricsControl.valueChanges.subscribe(async (value) => {
      this.metricInputText = value ?? '';
      if (this.metricsControl.valid) await this.loadStats();
    });

    if (!this.hidePeriodSelector && this.savedPeriod) {
      this.filterForm.patchValue({ datePeriod: JSON.parse(this.savedPeriod) }, { emitEvent: false });
    }

    if (this.initialPeriod) {
      this.filterForm.patchValue({ datePeriod: this.initialPeriod }, { emitEvent: false });
      if (this.initialActivities.length) {
        const { startDate, endDate } = this.initialPeriod;
        this.activities = this.initialActivities;
        this.selectedMetrics = this.getSelectedMetrics();
        this.buildChartData(this.initialActivities, startDate, endDate);
        this.lastLoadedState = `${startDate}|${endDate}|${this.metricInputText}`;
      }
    }
  }

  async ngAfterViewInit() {
    // DatePeriodInputComponent emits via valueChanges for preset periods (week/month),
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

    if (this.loadingData) return;
    this.lastLoadedState = currentState;
    this.loadingData = true;
    if (!this.skipLoadingModal) {
      this.loadingService.show('TK_LOADING');
      await new Promise(resolve => setTimeout(resolve));
    }

    try {
      if (this.initialized && this.filterForm.valid && this.metricsControl.valid && !this.fixedMetricName && !this.hidePeriodSelector) {
        localStorage.setItem('stats-date-period', JSON.stringify(this.filterForm.value.datePeriod));
        localStorage.setItem('stats-metrics', this.getSelectedMetrics().map(m => m.name).join(', '));
      }

      const activities = await this.activityService.getByDate(startDate, endDate);
      this.activities = activities;
      this.selectedMetrics = this.getSelectedMetrics();
      this.selectedCalendarMetricIndex = 0;
      this.buildChartData(activities, startDate, endDate);
    } finally {
      this.loadingData = false;
      if (!this.skipLoadingModal) this.loadingService.hide();
    }

    await this.loadStats();
  }

  private buildChartData(activities: IActivity[], startDate: string, endDate: string) {
    const dates = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      .map(d => format(d, 'yyyy-MM-dd'));

    this.activitiesGroupedByDate = dates.map((date) => {
      const activitiesAtDate = activities.filter((activity) => activity.date == date);
      return {
        date,
        activities: activitiesAtDate,
        avgValues: this.selectedMetrics.map(metric => {
          const hasData = activitiesAtDate.some(a => a.metricRecords.some(r => r.metricId === metric.id));
          return {
            metric,
            value: hasData ? this.getAverageValue(this.normalizeWithInterpolation(activitiesAtDate, metric)) : null,
          };
        }),
      };
    });

    if (!this.selectedMetrics.length) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const avg = this.translate.instant('TK_AVG');

    const colorProps = this.chartColor ? lineDatasetColor(this.chartColor) : {};

    if (dates.length === 1) {
      const datasets = this.selectedMetrics.map(metric => {
        const normalizedData = this.normalizeWithInterpolation(activities, metric);
        return {
          data: normalizedData.map((data) => data.value || 0),
          label: avg + ' ' + this.translate.instant(metric.name),
          ...LINE_DATASET_STYLE,
          ...colorProps,
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
          return entry?.value ?? null;
        })),
        label: avg + ' ' + this.translate.instant(metric.name),
        ...LINE_DATASET_STYLE,
        ...colorProps,
      }));

      const lastNonNullIdx = datasets.reduce((max, ds) => {
        const idx = ds.data.reduce<number>((last, v, i) => v !== null ? i : last, -1);
        return Math.max(max, idx);
      }, -1);

      const cutoff = lastNonNullIdx >= 0 ? lastNonNullIdx + 1 : dates.length;
      const slicedDatasets = datasets.map(ds => ({ ...ds, data: ds.data.slice(0, cutoff) }));

      const allValues = slicedDatasets.flatMap(ds => ds.data).filter((v): v is number => v !== null);
      const dataMin = allValues.length ? Math.min(...allValues) : 0;
      const dataMax = allValues.length ? Math.max(...allValues) : 10;

      const step = this.selectedMetrics.length
        ? Math.min(...this.selectedMetrics.map(m => m.step || 1))
        : 1;
      const floorStep = (v: number) => Math.floor(v / step) * step;
      const ceilStep = (v: number) => Math.ceil(v / step) * step;
      let yMin = floorStep(dataMin);
      let yMax = ceilStep(dataMax);
      if (Math.abs(yMin - dataMin) < 1e-9 && Math.abs(yMax - dataMax) < 1e-9) {
        yMin -= step;
        yMax += step;
      }

      const hardMins = this.selectedMetrics.map(m => m.minValue).filter((v): v is number => v != null);
      const hardMaxes = this.selectedMetrics.map(m => m.maxValue).filter((v): v is number => v != null);
      if (hardMins.length) yMin = Math.max(yMin, Math.min(...hardMins));
      if (hardMaxes.length) yMax = Math.min(yMax, Math.max(...hardMaxes));

      this.chartOptions = styledLineChartOptions({ fillHeight: this.fillHeight, yMin, yMax });

      this.chartData = {
        labels: dates.slice(0, cutoff).map(d => formatGraphDate(d, this.translate.currentLang || 'en')),
        datasets: slicedDatasets,
      };
      return;
    }

    this.chartOptions = styledLineChartOptions({ fillHeight: this.fillHeight });
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
    const lastActivityStartHour = new Time(last?.startTime).getHour();
    let lastHour = new Time(last?.endTime).getHour();

    if (lastActivityStartHour > lastHour) {
      // Last activity crosses midnight — show until midnight (00:00)
      lastHour = 24;
    } else if (startHour > lastHour) {
      // Overall range crosses midnight
      lastHour += 24;
    }

    for (let hour = startHour; hour <= lastHour; hour++) {
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
      day.avgValues.some(v => v.metric.id === metric.id && v.value !== null)
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

  interpolateZeros(data: (number | null)[]): (number | null)[] {
    const result: (number | null)[] = [...data];

    for (let i = 0; i < result.length; i++) {
      if (result[i] !== null) continue;

      let leftIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (result[j] !== null) { leftIdx = j; break; }
      }

      let rightIdx = -1;
      for (let j = i + 1; j < result.length; j++) {
        if (result[j] !== null) { rightIdx = j; break; }
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

  get calendarCells(): ({ date: string; dayNumber: number; avg: number | null } | null)[] {
    if (!this.activitiesGroupedByDate.length) return [];
    const metric = this.selectedMetrics[this.selectedCalendarMetricIndex];
    const first = parseISO(this.activitiesGroupedByDate[0].date);
    const offset = (first.getDay() + 6) % 7;
    const cells: ({ date: string; dayNumber: number; avg: number | null } | null)[] = Array(offset).fill(null);
    for (const day of this.activitiesGroupedByDate) {
      const entry = metric ? day.avgValues.find(v => v.metric.id === metric.id) : null;
      const avg = entry && entry.value !== null ? entry.value : null;
      cells.push({ date: day.date, dayNumber: +day.date.slice(8), avg });
    }
    return cells;
  }

  getDayBgColor(avg: number): string {
    let hue: number;
    if (avg <= 1) hue = 0;
    else if (avg <= 5) hue = (avg - 1) / 4 * 60;
    else if (avg <= 8) hue = 60 + (avg - 5) / 3 * 60;
    else hue = 120;
    return `hsla(${Math.round(hue)}, 65%, 50%, 0.38)`;
  }

  hasAnyValue(day: { avgValues: { metric: IMetric, value: number | null }[] }): boolean {
    return day.avgValues.some(entry => entry.value !== null);
  }
}
