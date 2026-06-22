import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format, parseISO, differenceInDays, subDays, addDays } from 'date-fns';
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
import { IActivity } from 'src/app/db/models/activity';
import { IMetric } from 'src/app/db/models/metric';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import { computeExperimentUptime } from 'src/app/functions/experiment';
import { getPeriodRange, isRulePeriodMet } from 'src/app/functions/rule-streak';

interface IndicatorRow {
  name: string;
  baseline: string | null;
  current: string | null;
  trend: 'up' | 'down' | 'flat' | 'unknown';
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
      this.progressPercent = this.computeProgress(this.experiment);

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

      const today = format(new Date(), 'yyyy-MM-dd');
      const startDate = this.experiment.startDate ?? today;
      const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
      const currentEnd = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;

      // Baseline: week before experiment start, falling back to first week of experiment
      const preExpStart = format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd');
      const firstWeekEnd = format(addDays(parseISO(startDate), 6), 'yyyy-MM-dd');
      const currentStart = format(subDays(parseISO(currentEnd), 6), 'yyyy-MM-dd');

      const [preExpActs, firstWeekActs, currentActs] = await Promise.all([
        this.activityService.getByDate(preExpStart, startDate),
        this.activityService.getByDate(startDate, firstWeekEnd),
        this.activityService.getByDate(currentStart, currentEnd),
      ]);

      this.indicators = (dbIndicators as IExperimentIndicator[]).slice(0, 3).map(ind => {
        const name = this.resolveIndicatorName(ind, actions, tags, items, metrics);
        const { baselineRaw, currentRaw, fmtFn } = this.resolveValues(ind, preExpActs, firstWeekActs, currentActs, metrics);
        const baseline = baselineRaw !== null ? fmtFn(baselineRaw) : null;
        const current = currentRaw !== null ? fmtFn(currentRaw) : null;
        const baselineDisp = baseline !== null ? parseFloat(baseline) : null;
        const currentDisp = current !== null ? parseFloat(current) : null;
        let trend: IndicatorRow['trend'] = 'unknown';
        if (currentDisp !== null) {
          if (baselineDisp === null || currentDisp === baselineDisp) {
            trend = 'flat';
          } else {
            const valueWentUp = currentDisp > baselineDisp;
            const isGood = ind.direction === 'increasing' ? valueWentUp : !valueWentUp;
            trend = isGood ? 'up' : 'down';
          }
        }
        return { name, baseline, current, trend };
      });

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

  private computeProgress(exp: IExperiment): number {
    if (!exp.startDate || !exp.endDate) return 0;
    const today = new Date();
    const start = parseISO(exp.startDate);
    const end = parseISO(exp.endDate);
    const total = differenceInDays(end, start);
    if (total <= 0) return 100;
    const elapsed = Math.min(differenceInDays(today, start), total);
    return Math.round((elapsed / total) * 100);
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

  private resolveValues(
    ind: IExperimentIndicator,
    preExpActs: IActivity[],
    firstWeekActs: IActivity[],
    currentActs: IActivity[],
    metrics: IMetric[],
  ): { baselineRaw: number | null; currentRaw: number | null; fmtFn: (v: number) => string } {
    if (ind.subjectType === 'metric') {
      const metric = metrics.find(m => m.id === ind.subjectId);
      const unit = metric?.unit ? ' ' + metric.unit : '';
      const avg = (acts: IActivity[]) => {
        const vals = acts.flatMap(a => a.metricRecords.filter(r => r.metricId === ind.subjectId)).map(r => r.value);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      const baselineRaw = avg(preExpActs) ?? avg(firstWeekActs);
      return { baselineRaw, currentRaw: avg(currentActs), fmtFn: v => `${Math.round(v * 10) / 10}${unit}` };
    }
    const minPerDay = (acts: IActivity[]) => {
      const matching = acts.filter(a => {
        if (ind.subjectType === 'action') return a.actions.some(ac => ac.id === ind.subjectId);
        if (ind.subjectType === 'tag') return a.tags.some(t => t.id === ind.subjectId) || a.actions.some(ac => ac.tags.some(t => t.id === ind.subjectId));
        return a.items.some(i => i.id === ind.subjectId);
      });
      const total = matching.reduce((sum, a) => {
        if (!a.endTime) return sum;
        const [sh, sm] = a.startTime.split(':').map(Number);
        const [eh, em] = a.endTime.split(':').map(Number);
        return sum + Math.max(0, eh * 60 + em - sh * 60 - sm);
      }, 0);
      return total > 0 ? Math.round((total / 7) * 10) / 10 : null;
    };
    const baselineRaw = minPerDay(preExpActs) ?? minPerDay(firstWeekActs);
    return { baselineRaw, currentRaw: minPerDay(currentActs), fmtFn: v => `${v} min/day` };
  }

  navigate(): void {
    this.router.navigate(['/experiment', this._config!.experimentId]);
  }
}
