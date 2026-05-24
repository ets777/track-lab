import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { DatabaseService } from './db/database.service';
import { ExperimentEntry, ExperimentForm } from '../components/experiment-form/experiment-form.component';
import { IExperiment, IExperimentCreateDto, ExperimentResultEntry } from '../db/models/experiment';
import { ExperimentIndicatorService } from './experiment-indicator.service';
import { ExperimentRuleService } from './experiment-rule.service';
import { ActivityService } from './activity.service';
import { IActivity } from '../db/models/activity';
import { Preferences } from '@capacitor/preferences';
import { format, addDays, subDays, parseISO } from 'date-fns';

const STATUS_CHECK_KEY = 'experiment-status-check-date';

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

  readonly finishedExperiments$ = new Subject<FinishedExperiment[]>();

  async addFromForm(form: ExperimentForm, entries: ExperimentEntry[], ruleIds: number[]): Promise<number> {
    const dto: IExperimentCreateDto = {
      title: form.title,
      startDate: form.datePeriod?.startDate ?? null,
      endDate: form.datePeriod?.endDate ?? null,
      factEndDate: null,
      isSuccess: null,
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

      const firstWeekEnd = format(addDays(parseISO(experiment.startDate), 7), 'yyyy-MM-dd');
      const indicators = await this.experimentIndicatorService.getByExperimentId(experiment.id);
      const metricIndicators = indicators.filter(i => i.subjectType === 'metric');

      // First-week check: no metric data at all → failed, no resultData saved
      if (today >= firstWeekEnd && metricIndicators.length > 0) {
        const firstWeekActs = await this.activityService.getByDate(experiment.startDate, firstWeekEnd);
        const hasData = firstWeekActs.some(a =>
          (a.metricRecords ?? []).some(r =>
            metricIndicators.some(i => i.subjectId === r.metricId && r.value != null)
          )
        );

        if (!hasData) {
          await this.update(experiment.id, { isSuccess: 0, factEndDate: firstWeekEnd, resultData: null });
          newlyFinished.push({ id: experiment.id, title: experiment.title });
          continue;
        }
      }

      // End-date check: endDate passed → evaluate success and save values
      if (experiment.endDate && today > experiment.endDate) {
        const { isSuccess, resultData } = await this.evaluateSuccess(
          experiment,
          metricIndicators.map(i => ({ subjectId: i.subjectId, direction: i.direction })),
        );
        await this.update(experiment.id, {
          isSuccess: isSuccess ? 1 : 0,
          factEndDate: experiment.endDate,
          resultData: resultData ? JSON.stringify(resultData) : null,
        });
        newlyFinished.push({ id: experiment.id, title: experiment.title });
      }
    }

    if (newlyFinished.length > 0) {
      this.finishedExperiments$.next(newlyFinished);
    }
  }

  private async evaluateSuccess(
    experiment: IExperiment,
    metricIndicators: Array<{ subjectId: number; direction: string }>,
  ): Promise<{ isSuccess: boolean; resultData: ExperimentResultEntry[] | null }> {
    if (metricIndicators.length === 0) return { isSuccess: true, resultData: null };

    const startDate = experiment.startDate!;
    const endDate = experiment.endDate!;

    const baselineEnd = startDate;
    const baselineStart = format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(parseISO(endDate), 6), 'yyyy-MM-dd');

    const [baselineActs, lastWeekActs] = await Promise.all([
      this.activityService.getByDate(baselineStart, baselineEnd),
      this.activityService.getByDate(lastWeekStart, endDate),
    ]);

    const avgFor = (acts: IActivity[], metricId: number): number | null => {
      const values = acts
        .flatMap(a => a.metricRecords ?? [])
        .filter(r => r.metricId === metricId && r.value != null)
        .map(r => r.value as number);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    const round1 = (v: number) => Math.round(v * 10) / 10;

    let isSuccess = true;
    const resultData: ExperimentResultEntry[] = [];

    for (const ind of metricIndicators) {
      const baseline = avgFor(baselineActs, ind.subjectId);
      const lastWeek = avgFor(lastWeekActs, ind.subjectId);

      if (baseline !== null && lastWeek !== null) {
        resultData.push({
          indicatorType: 'metric',
          indicatorId: ind.subjectId,
          initialValue: round1(baseline),
          resultValue: round1(lastWeek),
        });
      }

      if (ind.direction !== 'any' && baseline !== null && lastWeek !== null) {
        const improved = ind.direction === 'increasing' ? lastWeek > baseline : lastWeek < baseline;
        if (!improved) isSuccess = false;
      }
    }

    return { isSuccess, resultData: resultData.length > 0 ? resultData : null };
  }
}
