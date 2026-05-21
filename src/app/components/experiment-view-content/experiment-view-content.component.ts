import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonText } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, arrowUpOutline, arrowDownOutline } from 'ionicons/icons';
import { format, parseISO, differenceInDays, startOfMonth, subDays } from 'date-fns';
import { IExperiment, ExperimentResultEntry } from 'src/app/db/models/experiment';
import { formatDisplayDate } from 'src/app/functions/date';
import { IExperimentIndicator } from 'src/app/db/models/experiment-indicator';
import { ExperimentDirection } from 'src/app/db/models/experiment-metric';
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
import { RuleService } from 'src/app/services/rule.service';
import { ActivityService } from 'src/app/services/activity.service';
import { StatsContentComponent } from 'src/app/components/stats-content/stats-content.component';
import { StatsItemContentComponent } from 'src/app/components/stats-item-content/stats-item-content.component';
import { AggregateRuleCalendarComponent } from 'src/app/components/aggregate-rule-calendar/aggregate-rule-calendar.component';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';

interface IndicatorStats {
  baseline: string | null;
  current: string | null;
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
    IonIcon, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonText,
    StatsContentComponent, StatsItemContentComponent,
    AggregateRuleCalendarComponent, DatePeriodInputComponent,
  ],
})
export class ExperimentViewContentComponent implements OnInit {
  private translate = inject(TranslateService);
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

  filterForm = this.formBuilder.group({ datePeriod: [null as DatePeriod | null] });

  constructor() {
    addIcons({ trendingUpOutline, trendingDownOutline, arrowUpOutline, arrowDownOutline });
  }

  ngOnInit() {
    this.graphPeriod = this.initialGraphPeriod;
    this.filterForm.patchValue({ datePeriod: this.graphPeriod }, { emitEvent: false });
    this.filterForm.valueChanges.subscribe(val => {
      if (val.datePeriod) this.graphPeriod = val.datePeriod;
    });
    this.buildIndicatorViews();
    this.buildPeriods();
    this.computeProgress();
    this.updateRuleStatuses();
    this.computeIndicatorStats();
  }

  get experimentMinDate(): string {
    return this.experiment.startDate ?? '';
  }

  get experimentMaxDate(): string {
    const today = format(new Date(), 'yyyy-MM-dd');
    const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
    return effectiveEnd && effectiveEnd < today ? effectiveEnd : today;
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

  getDirectionSvg(direction: ExperimentDirection): string {
    if (direction === 'increasing') return 'assets/icon/trend-up.svg';
    if (direction === 'decreasing') return 'assets/icon/trend-down.svg';
    return 'assets/icon/trend-any.svg';
  }

  onRulePeriodTabChange(event: CustomEvent) {
    this.selectedRulePeriod = event.detail.value as RulePeriod;
    this.filteredRules = this.rules.filter(r => r.period === this.selectedRulePeriod);
    this.selectedDate = this.selectedRulePeriod === 'month'
      ? format(startOfMonth(new Date()), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
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

  private async computeIndicatorStats() {
    const startDate = this.experiment.startDate;
    if (!startDate) return;

    // Use stored values for finished experiments to avoid data-drift
    if (this.experiment.resultData) {
      const stored: ExperimentResultEntry[] = JSON.parse(this.experiment.resultData);
      this.indicatorViews = this.indicatorViews.map(ind => {
        if (ind.type !== 'metric' || !ind.metric) return ind;
        const entry = stored.find(e => e.indicatorType === 'metric' && e.indicatorId === ind.metric!.id);
        if (!entry) return ind;

        const unit = ind.metric.unit ? ' ' + ind.metric.unit : '';
        const fmt = (v: number) => `${v}${unit}`;
        const arrowUp = entry.resultValue !== entry.initialValue ? entry.resultValue > entry.initialValue : null;
        let color: IndicatorStats['color'] = 'medium';
        if (arrowUp !== null) {
          if (ind.direction === 'increasing') color = arrowUp ? 'success' : 'danger';
          else if (ind.direction === 'decreasing') color = arrowUp ? 'danger' : 'success';
        }

        return {
          ...ind,
          stats: {
            baseline: fmt(entry.initialValue),
            current: fmt(entry.resultValue),
            arrowUp,
            color,
          },
        };
      });
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const baselineEnd = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
    const baselineStart = format(subDays(parseISO(startDate), 7), 'yyyy-MM-dd');
    const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
    const currentEnd = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;
    const currentStart = format(subDays(parseISO(currentEnd), 6), 'yyyy-MM-dd');

    const [baselineActs, currentActs] = await Promise.all([
      this.activityService.getByDate(baselineStart, baselineEnd),
      this.activityService.getByDate(currentStart, currentEnd),
    ]);

    const avgFor = (acts: typeof baselineActs, metricId: number): number | null => {
      const values = acts
        .flatMap(a => a.metricRecords ?? [])
        .filter(r => r.metricId === metricId && r.value != null)
        .map(r => r.value as number);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    this.indicatorViews = this.indicatorViews.map(ind => {
      if (ind.type !== 'metric' || !ind.metric) return ind;

      const unit = ind.metric.unit ? ' ' + ind.metric.unit : '';
      const fmt = (v: number) => `${Math.round(v * 10) / 10}${unit}`;

      const baselineRaw = avgFor(baselineActs, ind.metric.id!);
      const currentRaw = avgFor(currentActs, ind.metric.id!);

      let arrowUp: boolean | null = null;
      let color: IndicatorStats['color'] = 'medium';

      if (baselineRaw !== null && currentRaw !== null && currentRaw !== baselineRaw) {
        arrowUp = currentRaw > baselineRaw;
        if (ind.direction === 'increasing') {
          color = arrowUp ? 'success' : 'danger';
        } else if (ind.direction === 'decreasing') {
          color = arrowUp ? 'danger' : 'success';
        }
      }

      return {
        ...ind,
        stats: {
          baseline: baselineRaw !== null ? fmt(baselineRaw) : null,
          current: currentRaw !== null ? fmt(currentRaw) : null,
          arrowUp,
          color,
        },
      };
    });
  }
}
