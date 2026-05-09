import { Injectable, inject } from '@angular/core';
import { format, subDays } from 'date-fns';
import { DatabaseService } from './db/database.service';
import { IRuleCompletionCreateDto, IRuleCompletionDb } from '../db/models/rule-completion';
import { IRule } from '../db/models/rule';
import { ActivityService } from './activity.service';
import { getCompletedPeriods, isRulePeriodMet } from '../functions/rule-streak';

@Injectable({ providedIn: 'root' })
export class RuleCompletionService extends DatabaseService<'ruleCompletions'> {
  private activityService = inject(ActivityService);

  protected tableName: 'ruleCompletions' = 'ruleCompletions';

  async getByRuleId(ruleId: number): Promise<IRuleCompletionDb[]> {
    return this.getAllWhereEquals('ruleId', ruleId) as Promise<IRuleCompletionDb[]>;
  }

  async getByRuleIds(ruleIds: number[]): Promise<IRuleCompletionDb[]> {
    if (!ruleIds.length) return [];
    return this.getAnyOf('ruleId', ruleIds) as Promise<IRuleCompletionDb[]>;
  }

  async deleteByRuleId(ruleId: number): Promise<void> {
    return this.delete({ ruleId });
  }

  /**
   * Archives periods older than 31 days that are not yet stored.
   * Uses last known completion as the starting point to archive only the gap forward.
   * Returns all archived completions for the rule.
   */
  async archiveAndGetCompletions(rule: IRule): Promise<IRuleCompletionDb[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const archiveCutoff = format(subDays(new Date(), 31), 'yyyy-MM-dd');

    // Rule started within the last month — nothing to archive
    if (rule.startDate >= archiveCutoff) return [];

    const allPeriods = getCompletedPeriods(rule, today);
    const archivablePeriods = allPeriods.filter(([, end]) => end <= archiveCutoff);
    if (!archivablePeriods.length) return [];

    const existing = await this.getByRuleId(rule.id);

    let gapPeriods: [string, string][];

    if (existing.length === 0) {
      // First time: archive everything from rule start to cutoff
      gapPeriods = archivablePeriods;
    } else {
      // Find last archived period, fill forward from there
      const lastPeriodStart = existing.reduce(
        (max, c) => (c.periodStart > max ? c.periodStart : max),
        existing[0].periodStart,
      );
      gapPeriods = archivablePeriods.filter(([start]) => start > lastPeriodStart);
    }

    if (!gapPeriods.length) return existing;

    // Load activities only for the gap range
    const fromDate = gapPeriods[0][0];
    const toDate = gapPeriods[gapPeriods.length - 1][1];
    const activities = await this.activityService.getAllEnrichedForRules(fromDate, toDate);

    const newCompletions: IRuleCompletionCreateDto[] = gapPeriods.map(([start, end]) => {
      const periodActivities = activities.filter(a => a.date >= start && a.date <= end);
      return {
        ruleId: rule.id,
        periodStart: start,
        met: isRulePeriodMet(rule, periodActivities) ? 1 : 0,
      };
    });

    await this.bulkAdd(newCompletions);

    return [
      ...existing,
      ...newCompletions.map((c, i) => ({ ...c, id: -(i + 1) }) as IRuleCompletionDb),
    ];
  }
}
