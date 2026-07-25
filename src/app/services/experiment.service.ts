import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { DatabaseService } from './db/database.service';
import { ExperimentEntry, ExperimentForm } from '../components/experiment-form/experiment-form.component';
import { IExperiment, IExperimentCreateDto, ExperimentResultEntry, ExperimentFailReason } from '../db/models/experiment';
import { IExperimentIndicator } from '../db/models/experiment-indicator';
import { ExperimentIndicatorService } from './experiment-indicator.service';
import { ExperimentRuleService } from './experiment-rule.service';
import { ActivityService } from './activity.service';
import { RuleService } from './rule.service';
import { RuleCompletionService } from './rule-completion.service';
import { SubjectReferenceService } from './subject-reference.service';
import { averageMetricValue, averageMinutesPerDay, computeExperimentUptime } from '../functions/experiment';
import { Preferences } from '@capacitor/preferences';
import { format, addDays, subDays, parseISO } from 'date-fns';

const STATUS_CHECK_KEY = 'experiment-status-check-date';
const UPTIME_FAIL_THRESHOLD = 50;

export interface FinishedExperiment {
  id: number;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class ExperimentService extends DatabaseService<'experiments'> {
  protected tableName: 'experiments' = 'experiments';

  private experimentIndicatorService = inject(ExperimentIndicatorService);
  private experimentRuleService = inject(ExperimentRuleService);
  private activityService = inject(ActivityService);
  private ruleService = inject(RuleService);
  private ruleCompletionService = inject(RuleCompletionService);
  private subjectReferenceService = inject(SubjectReferenceService);

  readonly finishedExperiments$ = new Subject<FinishedExperiment[]>();

  /**
   * Delete an experiment along with references that do not cascade.
   * `experimentIndicators` / `experimentRules` cascade via foreign keys;
   * dashboard widgets holding the experiment id do not.
   */
  async deleteWithRelations(id: number) {
    await this.subjectReferenceService.removeExperimentReferences(id);

    return this.delete({ id });
  }

  async addFromForm(form: ExperimentForm, entries: ExperimentEntry[], ruleIds: number[]): Promise<number> {
    const dto: IExperimentCreateDto = {
      title: form.title,
      startDate: form.datePeriod?.startDate ?? null,
      endDate: form.datePeriod?.endDate ?? null,
      factEndDate: null,
      isSuccess: null,
      failReasonId: null,
      resultData: null,
    };
    const experimentId = await this.add(dto);

    for (const entry of entries) {
      await this.experimentIndicatorService.add({ experimentId, subjectType: entry.type, subjectId: entry.subjectId, direction: entry.direction });
    }
    for (const ruleId of ruleIds) {
      await this.experimentRuleService.add({ experimentId, ruleId });
    }

    return experimentId;
  }

  async updateFromForm(id: number, form: ExperimentForm, entries: ExperimentEntry[], ruleIds: number[]): Promise<void> {
    await this.update(id, {
      title: form.title,
      startDate: form.datePeriod?.startDate ?? null,
      endDate: form.datePeriod?.endDate ?? null,
    });

    await this.experimentIndicatorService.deleteByExperimentId(id);
    for (const entry of entries) {
      await this.experimentIndicatorService.add({ experimentId: id, subjectType: entry.type, subjectId: entry.subjectId, direction: entry.direction });
    }

    await this.experimentRuleService.deleteByExperimentId(id);
    for (const ruleId of ruleIds) {
      await this.experimentRuleService.add({ experimentId: id, ruleId });
    }
  }

  async checkAndUpdateStatusesIfNeeded(): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { value: lastCheck } = await Preferences.get({ key: STATUS_CHECK_KEY });
    if (lastCheck === today) return;

    await this.runStatusChecks();
    await Preferences.set({ key: STATUS_CHECK_KEY, value: today });
  }

  private async runStatusChecks(): Promise<void> {
    const all = (await this.getAll()) as IExperiment[];
    const inProgress = all.filter(e => e.isSuccess === null && !e.factEndDate);
    const today = format(new Date(), 'yyyy-MM-dd');
    const newlyFinished: FinishedExperiment[] = [];

    for (const experiment of inProgress) {
      if (!experiment.startDate) continue;

      const indicators = await this.experimentIndicatorService.getByExperimentId(experiment.id);

      // First-week check: trending metrics with no initial value (neither the week
      // before the experiment nor its first week) → failed
      const firstWeekEnd = format(addDays(parseISO(experiment.startDate), 7), 'yyyy-MM-dd');
      const trendingMetrics = indicators.filter(i => i.subjectType === 'metric' && i.direction !== 'any');

      if (today >= firstWeekEnd && trendingMetrics.length > 0) {
        const baselineStart = format(subDays(parseISO(experiment.startDate), 6), 'yyyy-MM-dd');
        const acts = await this.activityService.getByDate(baselineStart, firstWeekEnd);
        const missingInitial = trendingMetrics.some(i => averageMetricValue(acts, i.subjectId) === null);

        if (missingInitial) {
          await this.update(experiment.id, {
            isSuccess: 0,
            factEndDate: firstWeekEnd,
            failReasonId: ExperimentFailReason.InitialValuesNotLogged,
            resultData: null,
          });
          newlyFinished.push({ id: experiment.id, title: experiment.title });
          continue;
        }
      }

      // Uptime check: experiment-period uptime below 50% → failed (skip during first week)
      const uptime = await this.computeUptime(experiment, today);
      if (uptime !== null && uptime < UPTIME_FAIL_THRESHOLD && today >= firstWeekEnd) {
        await this.update(experiment.id, {
          isSuccess: 0,
          factEndDate: today,
          failReasonId: ExperimentFailReason.LowUptime,
          resultData: null,
        });
        newlyFinished.push({ id: experiment.id, title: experiment.title });
        continue;
      }

      // End-date check: endDate passed → evaluate success and save values
      if (experiment.endDate && today > experiment.endDate) {
        const { isSuccess, failReasonId, resultData } = await this.evaluateResult(experiment, indicators);
        await this.update(experiment.id, {
          isSuccess: isSuccess ? 1 : 0,
          factEndDate: experiment.endDate,
          failReasonId,
          resultData: resultData ? JSON.stringify(resultData) : null,
        });
        newlyFinished.push({ id: experiment.id, title: experiment.title });
      }
    }

    if (newlyFinished.length > 0) {
      this.finishedExperiments$.next(newlyFinished);
    }
  }

  private async computeUptime(experiment: IExperiment, today: string): Promise<number | null> {
    const links = await this.experimentRuleService.getByExperimentId(experiment.id);
    if (!links.length) return null;

    const ruleIds = new Set(links.map(l => l.ruleId));
    const rules = (await this.ruleService.getAll()).filter(r => ruleIds.has(r.id));
    if (!rules.length) return null;

    const completionsMap = new Map<number, Map<string, boolean>>();
    for (const rule of rules) {
      const completions = await this.ruleCompletionService.archiveAndGetCompletions(rule);
      const map = new Map<string, boolean>();
      for (const c of completions) map.set(c.periodStart, c.met === 1);
      completionsMap.set(rule.id, map);
    }

    // Fetch with a month of margin so week/month period ranges are covered
    const earliest = [experiment.startDate!, ...rules.map(r => r.startDate)].sort()[0];
    const activitiesFrom = format(subDays(parseISO(earliest), 31), 'yyyy-MM-dd');
    const activities = await this.activityService.getAllEnrichedForRules(activitiesFrom);

    const end = experiment.endDate && experiment.endDate < today ? experiment.endDate : today;
    return computeExperimentUptime(rules, activities, completionsMap, experiment.startDate!, end, today);
  }

  private async evaluateResult(
    experiment: IExperiment,
    indicators: IExperimentIndicator[],
  ): Promise<{ isSuccess: boolean; failReasonId: number | null; resultData: ExperimentResultEntry[] | null }> {
    if (indicators.length === 0) return { isSuccess: true, failReasonId: null, resultData: null };

    const startDate = experiment.startDate!;
    const endDate = experiment.endDate!;

    const baselineStart = format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd');
    const firstWeekEnd = format(addDays(parseISO(startDate), 6), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(parseISO(endDate), 6), 'yyyy-MM-dd');

    const [baselineActs, firstWeekActs, lastWeekActs] = await Promise.all([
      this.activityService.getByDate(baselineStart, startDate),
      this.activityService.getByDate(startDate, firstWeekEnd),
      this.activityService.getByDate(lastWeekStart, endDate),
    ]);

    const round1 = (v: number) => Math.round(v * 10) / 10;
    const failReasons = new Set<ExperimentFailReason>();
    const resultData: ExperimentResultEntry[] = [];

    for (const ind of indicators) {
      if (ind.subjectType === 'metric') {
        // Initial value: week before the experiment, falling back to its first week
        const initial = averageMetricValue(baselineActs, ind.subjectId)
          ?? averageMetricValue(firstWeekActs, ind.subjectId);
        const final = averageMetricValue(lastWeekActs, ind.subjectId);

        resultData.push({
          indicatorType: 'metric',
          indicatorId: ind.subjectId,
          initialValue: initial !== null ? round1(initial) : null,
          resultValue: final !== null ? round1(final) : null,
        });

        if (ind.direction === 'any') continue;
        if (initial === null) {
          failReasons.add(ExperimentFailReason.InitialValuesNotLogged);
        } else if (final === null) {
          failReasons.add(ExperimentFailReason.FinalValuesNotLogged);
        } else {
          const improved = ind.direction === 'increasing' ? final > initial : final < initial;
          if (!improved) failReasons.add(ExperimentFailReason.TrendNotMet);
        }
      } else {
        // Items/actions/tags: missing records count as 0 minutes
        const subjectType = ind.subjectType as 'action' | 'tag' | 'item';
        const initial = averageMinutesPerDay(baselineActs, subjectType, ind.subjectId)
          ?? averageMinutesPerDay(firstWeekActs, subjectType, ind.subjectId)
          ?? 0;
        const final = averageMinutesPerDay(lastWeekActs, subjectType, ind.subjectId) ?? 0;

        resultData.push({
          indicatorType: subjectType,
          indicatorId: ind.subjectId,
          initialValue: round1(initial),
          resultValue: round1(final),
        });

        if (ind.direction === 'any') continue;
        const improved = ind.direction === 'increasing' ? final > initial : final < initial;
        if (!improved) failReasons.add(ExperimentFailReason.TrendNotMet);
      }
    }

    const failReasonId = [
      ExperimentFailReason.InitialValuesNotLogged,
      ExperimentFailReason.FinalValuesNotLogged,
      ExperimentFailReason.TrendNotMet,
    ].find(r => failReasons.has(r)) ?? null;

    return {
      isSuccess: failReasonId === null,
      failReasonId,
      resultData: resultData.length > 0 ? resultData : null,
    };
  }
}
