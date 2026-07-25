import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format, subDays } from 'date-fns';
import { ExperimentWidgetConfig } from 'src/app/types/dashboard-widget';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ExperimentIndicatorService } from 'src/app/services/experiment-indicator.service';
import { ExperimentRuleService } from 'src/app/services/experiment-rule.service';
import { RuleService } from 'src/app/services/rule.service';
import { RuleCompletionService } from 'src/app/services/rule-completion.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { MetricService } from 'src/app/services/metric.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { IExperiment } from 'src/app/db/models/experiment';
import { IExperimentIndicator } from 'src/app/db/models/experiment-indicator';
import { IRule } from 'src/app/db/models/rule';
import { IMetric } from 'src/app/db/models/metric';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
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
import { getPeriodRange, isRulePeriodMet } from 'src/app/functions/rule-streak';

interface IndicatorRow {
  name: string;
  baseline: string;
  current: string;
  /** null when the value did not change or cannot be compared. */
  arrowUp: boolean | null;
  outcome: 'good' | 'bad' | 'neutral';
  hasCurrent: boolean;
}

@Component({
  selector: 'app-experiment-dashboard-widget',
  templateUrl: './experiment-dashboard-widget.component.html',
  styleUrl: './experiment-dashboard-widget.component.scss',
  imports: [IonSkeletonText, TranslateModule],
})
export class ExperimentDashboardWidgetComponent {
  @Input() set config(value: ExperimentWidgetConfig) {
    this._config = value;
    this.load();
  }
  get config(): ExperimentWidgetConfig { return this._config!; }
  private _config?: ExperimentWidgetConfig;

  private experimentService = inject(ExperimentService);
  private indicatorService = inject(ExperimentIndicatorService);
  private experimentRuleService = inject(ExperimentRuleService);
  private ruleService = inject(RuleService);
  private ruleCompletionService = inject(RuleCompletionService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private metricService = inject(MetricService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);
  private router = inject(Router);

  @Output() lineCountChange = new EventEmitter<number>();

  isLoading = true;
  experiment: IExperiment | null = null;
  progressPercent = 0;
  indicators: IndicatorRow[] = [];
  ruleItems: { name: string; currentlyMet: boolean }[] = [];
  uptime: number | null = null;

  constructor() {}

  private async load(): Promise<void> {
    if (!this._config) return;
    this.isLoading = true;
    try {
      const exp = await this.experimentService.getById(this._config.experimentId);
      if (!exp) { this.isLoading = false; return; }
      this.experiment = exp as IExperiment;
      this.progressPercent = computeExperimentProgress(this.experiment);

      const [dbIndicators, actions, tags, items, metrics, experimentRuleLinks, allRules] = await Promise.all([
        this.indicatorService.getByExperimentId(this.experiment.id),
        this.actionService.getAll() as Promise<IActionDb[]>,
        this.tagService.getAll() as Promise<ITag[]>,
        this.itemService.getAll() as Promise<IItem[]>,
        this.metricService.getAll() as Promise<IMetric[]>,
        this.experimentRuleService.getByExperimentId(this.experiment.id),
        this.ruleService.getAll(),
      ]);

      const ruleIdSet = new Set(experimentRuleLinks.map((r: any) => r.ruleId));
      const experimentRules = (allRules as IRule[]).filter(r => ruleIdSet.has(r.id));

      const windows = getExperimentWindows(this.experiment);
      const today = windows?.today ?? format(new Date(), 'yyyy-MM-dd');
      const currentEnd = windows?.currentEnd ?? today;
      const visibleIndicators = (dbIndicators as IExperimentIndicator[]).slice(0, 3);

      if (windows && visibleIndicators.length) {
        const [baseline, firstWeek, current] = await Promise.all([
          this.activityService.getByDate(windows.baselineStart, windows.startDate),
          this.activityService.getByDate(windows.startDate, windows.firstWeekEnd),
          this.activityService.getByDate(windows.currentStart, windows.currentEnd),
        ]);
        const buckets = { baseline, firstWeek, current };

        this.indicators = visibleIndicators.map(ind => {
          const subjectType = ind.subjectType as ExperimentSubjectType;
          // Finished experiments read their stored result so the widget and the
          // view page never disagree after later activity edits.
          const raw = storedIndicatorRawStats(this.experiment!.resultData, subjectType, ind.subjectId)
            ?? computeIndicatorRawStats(subjectType, ind.subjectId, buckets);
          const unit = subjectType === 'metric'
            ? (metrics.find(m => m.id === ind.subjectId)?.unit ? ' ' + metrics.find(m => m.id === ind.subjectId)!.unit : '')
            : ' min/day';
          const { arrowUp, outcome } = compareIndicator(ind.direction, raw.initialRaw, raw.currentRaw);

          return {
            name: this.resolveIndicatorName(ind, actions, tags, items, metrics),
            baseline: formatIndicatorValue(raw.initialRaw, unit),
            current: formatIndicatorValue(raw.currentRaw, unit),
            arrowUp,
            outcome,
            hasCurrent: raw.currentRaw !== null,
          };
        });
      } else {
        this.indicators = [];
      }

      if (experimentRules.length && this.experiment.startDate) {
        const completionsMap = new Map<number, Map<string, boolean>>();
        for (const rule of experimentRules) {
          const completions = await this.ruleCompletionService.archiveAndGetCompletions(rule);
          const map = new Map<string, boolean>();
          for (const c of completions) map.set(c.periodStart, c.met === 1);
          completionsMap.set(rule.id, map);
        }
        const thirtyOneDaysAgo = format(subDays(new Date(), 31), 'yyyy-MM-dd');
        const uptimeFrom = [thirtyOneDaysAgo, this.experiment.startDate, ...experimentRules.map(r => r.startDate)]
          .filter(Boolean)
          .sort()[0] as string;
        const uptimeActs = await this.activityService.getAllEnrichedForRules(uptimeFrom, currentEnd);

        this.ruleItems = experimentRules.map(rule => {
          let subjectName = '';
          if (rule.subjectType === 'action') subjectName = actions.find(a => a.id === rule.subjectId)?.name ?? '';
          else if (rule.subjectType === 'tag') subjectName = tags.find(t => t.id === rule.subjectId)?.name ?? '';
          else subjectName = items.find(i => i.id === rule.subjectId)?.name ?? '';
          const name = this.ruleService.buildName(rule, subjectName);
          const [periodStart, periodEnd] = getPeriodRange(today, rule.period);
          const periodActs = uptimeActs.filter(a => a.date >= periodStart && a.date <= periodEnd);
          const currentlyMet = isRulePeriodMet(rule, periodActs);
          return { name, currentlyMet };
        });

        this.uptime = computeExperimentUptime(
          experimentRules,
          uptimeActs,
          completionsMap,
          this.experiment.startDate,
          currentEnd,
          today,
        );
      }

      this.lineCountChange.emit(Math.min(this.indicators.length, 3) + Math.min(this.ruleItems.length, 3));
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentDashboardWidgetComponent.load', e);
    } finally {
      this.isLoading = false;
    }
  }

  private resolveIndicatorName(
    ind: IExperimentIndicator,
    actions: IActionDb[], tags: ITag[], items: IItem[], metrics: IMetric[],
  ): string {
    if (ind.subjectType === 'metric') {
      const m = metrics.find(x => x.id === ind.subjectId);
      return m ? this.translate.instant(m.name) : String(ind.subjectId);
    }
    if (ind.subjectType === 'action') return actions.find(a => a.id === ind.subjectId)?.name ?? String(ind.subjectId);
    if (ind.subjectType === 'tag') return tags.find(t => t.id === ind.subjectId)?.name ?? String(ind.subjectId);
    return items.find(i => i.id === ind.subjectId)?.name ?? String(ind.subjectId);
  }

  navigate(): void {
    this.router.navigate(['/experiment', this._config!.experimentId]);
  }
}
