import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, arrowUpOutline, arrowDownOutline, arrowForwardOutline, chevronForwardOutline } from 'ionicons/icons';
import { format, parseISO, startOfMonth } from 'date-fns';
import { IExperiment, EXPERIMENT_FAIL_REASON_KEYS, ExperimentFailReason } from 'src/app/db/models/experiment';
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
import {
  ExperimentSubjectType,
  compareIndicator,
  computeExperimentProgress,
  computeExperimentUptime,
  computeIndicatorRawStats,
  formatIndicatorValue,
  getExperimentWindows,
  storedIndicatorRawStats,
} from 'src/app/functions/experiment';
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
    this.progressPercent = computeExperimentProgress(this.experiment);
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

  private buildStats(ind: IndicatorView, initialRaw: number | null, currentRaw: number | null): IndicatorStats {
    const unit = ind.type === 'metric' ? (ind.metric?.unit ? ' ' + ind.metric.unit : '') : ' min/day';
    const { arrowUp, outcome } = compareIndicator(ind.direction, initialRaw, currentRaw);
    const color: IndicatorStats['color'] = outcome === 'good' ? 'success' : outcome === 'bad' ? 'danger' : 'medium';

    return {
      baseline: formatIndicatorValue(initialRaw, unit),
      current: formatIndicatorValue(currentRaw, unit),
      arrowUp,
      color,
    };
  }

  private async computeIndicatorStats() {
    const windows = getExperimentWindows(this.experiment);
    if (!windows) return;

    // Finished experiments: use stored resultData to avoid data-drift
    this.indicatorViews = this.indicatorViews.map(ind => {
      const stored = storedIndicatorRawStats(this.experiment.resultData, ind.type, ind.subjectId);
      return stored ? { ...ind, stats: this.buildStats(ind, stored.initialRaw, stored.currentRaw) } : ind;
    });

    if (this.indicatorViews.every(ind => ind.stats)) return;

    const [baseline, firstWeek, current] = await Promise.all([
      this.activityService.getByDate(windows.baselineStart, windows.startDate),
      this.activityService.getByDate(windows.startDate, windows.firstWeekEnd),
      this.activityService.getByDate(windows.currentStart, windows.currentEnd),
    ]);
    const buckets = { baseline, firstWeek, current };

    this.indicatorViews = this.indicatorViews.map(ind => {
      if (ind.stats) return ind; // already set from stored resultData
      const raw = computeIndicatorRawStats(ind.type as ExperimentSubjectType, ind.subjectId, buckets);
      return { ...ind, stats: this.buildStats(ind, raw.initialRaw, raw.currentRaw) };
    });
  }

  private computeExperimentRuleStats() {
    const windows = getExperimentWindows(this.experiment);
    if (!this.rules.length || !windows) return;

    this.combinedUptime = computeExperimentUptime(
      this.rules,
      this.allActivities,
      this.completionsMap,
      windows.startDate,
      windows.currentEnd,
      windows.today,
    );
  }
}
