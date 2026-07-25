import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, arrowUpOutline, arrowDownOutline, arrowForwardOutline, chevronForwardOutline } from 'ionicons/icons';
import { format, parseISO, differenceInDays, startOfMonth, subDays, addDays } from 'date-fns';
import { IExperiment, ExperimentResultEntry, EXPERIMENT_FAIL_REASON_KEYS, ExperimentFailReason } from 'src/app/db/models/experiment';
import { formatDisplayDate } from 'src/app/functions/date';
import { IExperimentIndicator } from 'src/app/db/models/experiment-indicator';
import { ExperimentDirection } from 'src/app/db/models/experiment-indicator';
import { IRule, RulePeriod } from 'src/app/db/models/rule';
import { IActivity } from 'src/app/db/models/activity';
import { IMetric } from 'src/app/db/models/metric';
import { IList } from 'src/app/db/models/list';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { DatePeriod } from 'src/app/types/date-period';
import { RuleDayStatus, computeRuleStatusesForDay } from 'src/app/functions/rule-color';
import { averageMetricValue, averageMinutesPerDay, computeExperimentUptime } from 'src/app/functions/experiment';
import { Router } from '@angular/router';
import { RuleService } from 'src/app/services/rule.service';
import { ActivityService } from 'src/app/services/activity.service';
import { StatsContentComponent } from 'src/app/components/stats-content/stats-content.component';
import { StatsItemContentComponent } from 'src/app/components/stats-item-content/stats-item-content.component';
import { AggregateRuleCalendarComponent } from 'src/app/components/aggregate-rule-calendar/aggregate-rule-calendar.component';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';

interface IndicatorStats {
  baseline: string;
  current: string;
  arrowUp: boolean | null;
  color: 'success' | 'danger' | 'medium';
}

interface IndicatorView {
  type: 'metric' | 'action' | 'tag' | 'item';
  subjectId: number;
  direction: ExperimentDirection;
  displayName: string;
  subtitle: string;
  metric?: IMetric;
  commonItem?: CommonItem;
  stats?: IndicatorStats;
}

@Component({
  selector: 'app-experiment-view-content',
  templateUrl: './experiment-view-content.component.html',
  styleUrls: ['./experiment-view-content.component.scss'],
  imports: [
    CommonModule, TranslateModule, ReactiveFormsModule,
    IonIcon, IonSegment, IonSegmentButton, IonLabel,
    StatsContentComponent, StatsItemContentComponent,
    AggregateRuleCalendarComponent, DatePeriodInputComponent,
  ],
})
export class ExperimentViewContentComponent implements OnInit {
  private translate = inject(TranslateService);
  private router = inject(Router);
  private ruleService = inject(RuleService);
  private activityService = inject(ActivityService);
  private formBuilder = inject(FormBuilder);

  @Input() experiment!: IExperiment;
  @Input() indicators: IExperimentIndicator[] = [];
  @Input() rules: IRule[] = [];
  @Input() allActivities: IActivity[] = [];
  @Input() completionsMap: Map<number, Map<string, boolean>> = new Map();
  @Input() initialGraphPeriod!: DatePeriod;
  @Input() allMetrics: IMetric[] = [];
  @Input() lists: IList[] = [];
  @Input() allSuggestions: Selectable<CommonItem>[] = [];
  @Input() allActions: IActionDb[] = [];
  @Input() allTags: ITag[] = [];
  @Input() allItems: IItem[] = [];

  indicatorViews: IndicatorView[] = [];
  availablePeriods: RulePeriod[] = [];
  selectedRulePeriod: RulePeriod = 'day';
  filteredRules: IRule[] = [];
  selectedDate = format(new Date(), 'yyyy-MM-dd');
  ruleDayStatuses: RuleDayStatus[] = [];
  progressPercent = 0;
  graphPeriod!: DatePeriod;
  combinedUptime: number | null = null;

  filterForm = this.formBuilder.group({ datePeriod: [null as DatePeriod | null] });

  constructor() {
    addIcons({ trendingUpOutline, trendingDownOutline, arrowUpOutline, arrowDownOutline, arrowForwardOutline, chevronForwardOutline });
  }

  ngOnInit() {
    this.graphPeriod = this.initialGraphPeriod;
    this.filterForm.patchValue({ datePeriod: this.graphPeriod }, { emitEvent: false });
    this.filterForm.valueChanges.subscribe(val => {
      if (val.datePeriod) this.graphPeriod = val.datePeriod;
    });
    this.selectedDate = this.clampToExperiment(this.selectedDate);
    this.buildIndicatorViews();
    this.buildPeriods();
    this.computeProgress();
    this.updateRuleStatuses();
    this.computeIndicatorStats();
    this.computeExperimentRuleStats();
  }

  get experimentMinDate(): string {
    return this.experiment.startDate ?? '';
  }

  get experimentMaxDate(): string {
    const today = format(new Date(), 'yyyy-MM-dd');
    const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
    return effectiveEnd && effectiveEnd < today ? effectiveEnd : today;
  }

  /** Calendar bound: full experiment period, including future days of an ongoing experiment. */
  get calendarMaxDate(): string {
    return this.experiment.factEndDate
      ?? this.experiment.endDate
      ?? format(new Date(), 'yyyy-MM-dd');
  }

  get startLabel(): string {
    if (!this.experiment.startDate) return '—';
    return formatDisplayDate(this.experiment.startDate, this.translate.currentLang || 'en');
  }

  get endLabel(): string {
    const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
    if (!effectiveEnd) return this.translate.instant('TK_ONGOING');
    return formatDisplayDate(effectiveEnd, this.translate.currentLang || 'en');
  }

  get failReasonKey(): string | null {
    if (this.experiment.isSuccess !== 0 || !this.experiment.failReasonId) return null;
    return EXPERIMENT_FAIL_REASON_KEYS[this.experiment.failReasonId as ExperimentFailReason] ?? null;
  }

  getDirectionSvg(direction: ExperimentDirection): string {
    if (direction === 'increasing') return 'assets/icon/trend-up.svg';
    if (direction === 'decreasing') return 'assets/icon/trend-down.svg';
    return 'assets/icon/trend-any.svg';
  }

  onRulePeriodTabChange(event: CustomEvent) {
    this.selectedRulePeriod = event.detail.value as RulePeriod;
    this.filteredRules = this.rules.filter(r => r.period === this.selectedRulePeriod);
    const baseDate = this.clampToExperiment(format(new Date(), 'yyyy-MM-dd'));
    this.selectedDate = this.selectedRulePeriod === 'month'
      ? format(startOfMonth(parseISO(baseDate)), 'yyyy-MM-dd')
      : baseDate;
    this.updateRuleStatuses();
  }

  onDaySelected(date: string): void {
    this.selectedDate = date;
    this.updateRuleStatuses();
  }

  onMonthChanged(date: Date): void {
    if (this.selectedRulePeriod === 'month') {
      this.selectedDate = format(startOfMonth(date), 'yyyy-MM-dd');
      this.updateRuleStatuses();
    }
  }

  navigateToRule(ruleId: number) {
    this.router.navigate(['/rule', ruleId]);
  }

  getRuleName(result: RuleDayStatus): string {
    const rule = result.rule;
    let subjectName = '';
    if (rule.subjectType === 'action') subjectName = this.allActions.find(a => a.id === rule.subjectId)?.name ?? '';
    else if (rule.subjectType === 'tag') subjectName = this.allTags.find(t => t.id === rule.subjectId)?.name ?? '';
    else subjectName = this.allItems.find(i => i.id === rule.subjectId)?.name ?? '';
    return this.ruleService.buildName(rule, subjectName);
  }

  private buildIndicatorViews() {
    this.indicatorViews = this.indicators.map(ind => {
      if (ind.subjectType === 'metric') {
        const metric = this.allMetrics.find(m => m.id === ind.subjectId);
        return {
          type: 'metric' as const,
          subjectId: ind.subjectId,
          direction: ind.direction,
          displayName: metric ? this.translate.instant(metric.name) : String(ind.subjectId),
          subtitle: this.translate.instant('TK_METRIC'),
          metric,
        };
      }
      const found = this.allSuggestions.find(s => s.item.type === ind.subjectType && s.item.itemId === ind.subjectId);
      return {
        type: ind.subjectType as IndicatorView['type'],
        subjectId: ind.subjectId,
        direction: ind.direction,
        displayName: found?.title ?? String(ind.subjectId),
        subtitle: found?.subtitle ?? this.translate.instant('TK_' + ind.subjectType.toUpperCase()),
        commonItem: found?.item,
      };
    });
  }

  private buildPeriods() {
    const periods = new Set(this.rules.map(r => r.period));
    this.availablePeriods = (['day', 'week', 'month'] as RulePeriod[]).filter(p => periods.has(p));
    this.selectedRulePeriod = this.availablePeriods[0] ?? 'day';
    this.filteredRules = this.rules.filter(r => r.period === this.selectedRulePeriod);
  }

  private computeProgress() {
    if (this.experiment.factEndDate) { this.progressPercent = 100; return; }
    const start = this.experiment.startDate;
    const end = this.experiment.endDate;
    if (!start) { this.progressPercent = 0; return; }
    if (!end) { this.progressPercent = 100; return; }
    const total = differenceInDays(parseISO(end), parseISO(start));
    if (total <= 0) { this.progressPercent = 100; return; }
    const elapsed = differenceInDays(new Date(), parseISO(start));
    this.progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  private updateRuleStatuses() {
    this.ruleDayStatuses = computeRuleStatusesForDay(this.selectedDate, this.allActivities, this.filteredRules);
  }

  private clampToExperiment(date: string): string {
    let result = date;
    if (this.experimentMaxDate && result > this.experimentMaxDate) result = this.experimentMaxDate;
    if (this.experimentMinDate && result < this.experimentMinDate) result = this.experimentMinDate;
    return result;
  }

  /** Formats stats; null = "not logged" → "??" for metrics, 0 for items/actions/tags. */
  private buildStats(ind: IndicatorView, initialRaw: number | null, currentRaw: number | null): IndicatorStats {
    const isMetric = ind.type === 'metric';
    if (!isMetric) {
      initialRaw = initialRaw ?? 0;
      currentRaw = currentRaw ?? 0;
    }

    const unit = isMetric ? (ind.metric?.unit ? ' ' + ind.metric.unit : '') : ' min/day';
    const fmt = (v: number | null) => v === null ? '??' : `${Math.round(v * 10) / 10}${unit}`;

    let arrowUp: boolean | null = null;
    let color: IndicatorStats['color'] = 'medium';
    if (initialRaw !== null && currentRaw !== null && currentRaw !== initialRaw) {
      arrowUp = currentRaw > initialRaw;
      if (ind.direction === 'increasing') color = arrowUp ? 'success' : 'danger';
      else if (ind.direction === 'decreasing') color = arrowUp ? 'danger' : 'success';
    }

    return { baseline: fmt(initialRaw), current: fmt(currentRaw), arrowUp, color };
  }

  private async computeIndicatorStats() {
    const startDate = this.experiment.startDate;
    if (!startDate) return;

    // Finished experiments: use stored resultData to avoid data-drift
    if (this.experiment.resultData) {
      const stored: ExperimentResultEntry[] = JSON.parse(this.experiment.resultData);
      this.indicatorViews = this.indicatorViews.map(ind => {
        const entry = stored.find(e => e.indicatorType === ind.type && e.indicatorId === ind.subjectId);
        if (!entry) return ind;
        return { ...ind, stats: this.buildStats(ind, entry.initialValue ?? null, entry.resultValue ?? null) };
      });

      if (this.indicatorViews.every(ind => ind.stats)) return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const baselineStart = format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd');
    const firstWeekEnd = format(addDays(parseISO(startDate), 6), 'yyyy-MM-dd');
    const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
    const currentEnd = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;
    const currentStart = format(subDays(parseISO(currentEnd), 6), 'yyyy-MM-dd');

    const [baselineActs, firstWeekActs, currentActs] = await Promise.all([
      this.activityService.getByDate(baselineStart, startDate),
      this.activityService.getByDate(startDate, firstWeekEnd),
      this.activityService.getByDate(currentStart, currentEnd),
    ]);

    this.indicatorViews = this.indicatorViews.map(ind => {
      if (ind.stats) return ind; // already set from stored resultData

      if (ind.type === 'metric' && ind.metric) {
        // Initial value: week before the experiment, falling back to its first week
        const initial = averageMetricValue(baselineActs, ind.metric.id!)
          ?? averageMetricValue(firstWeekActs, ind.metric.id!);
        const current = averageMetricValue(currentActs, ind.metric.id!);
        return { ...ind, stats: this.buildStats(ind, initial, current) };
      }

      if (ind.type !== 'metric') {
        const initial = averageMinutesPerDay(baselineActs, ind.type, ind.subjectId)
          ?? averageMinutesPerDay(firstWeekActs, ind.type, ind.subjectId);
        const current = averageMinutesPerDay(currentActs, ind.type, ind.subjectId);
        return { ...ind, stats: this.buildStats(ind, initial, current) };
      }

      return ind;
    });
  }

  private computeExperimentRuleStats() {
    if (!this.rules.length || !this.experiment.startDate) return;

    const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
    const today = format(new Date(), 'yyyy-MM-dd');
    const end = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;

    this.combinedUptime = computeExperimentUptime(
      this.rules,
      this.allActivities,
      this.completionsMap,
      this.experiment.startDate,
      end,
      today,
    );
  }
}
