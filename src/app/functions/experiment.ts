import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { IActivity } from '../db/models/activity';
import { IRule } from '../db/models/rule';
import { getPeriodRange, isRulePeriodMet } from './rule-streak';

export type ExperimentSubjectType = 'metric' | 'action' | 'tag' | 'item';

export function averageMetricValue(activities: IActivity[], metricId: number): number | null {
  const values = activities
    .flatMap(a => a.metricRecords ?? [])
    .filter(r => r.metricId === metricId && r.value != null)
    .map(r => r.value as number);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function averageMinutesPerDay(
  activities: IActivity[],
  subjectType: Exclude<ExperimentSubjectType, 'metric'>,
  subjectId: number,
): number | null {
  const matching = activities.filter(a => {
    if (subjectType === 'action') return a.actions.some(ac => ac.id === subjectId);
    if (subjectType === 'tag') return a.tags.some(t => t.id === subjectId);
    return a.items.some(i => i.id === subjectId);
  });
  const totalMin = matching.reduce((sum, a) => {
    if (!a.endTime) return sum;
    const [sh, sm] = a.startTime.split(':').map(Number);
    const [eh, em] = a.endTime.split(':').map(Number);
    return sum + Math.max(0, eh * 60 + em - sh * 60 - sm);
  }, 0);
  return totalMin > 0 ? Math.round((totalMin / 7) * 10) / 10 : null;
}

/**
 * Average of per-rule uptimes within [startDate, endDate].
 * Each rule is evaluated on its own period granularity (day/week/month).
 * Periods still in progress (ending on or after `today`) are excluded from counting.
 * Returns null when no completed periods exist for any rule.
 */
export function computeExperimentUptime(
  rules: IRule[],
  allActivities: IActivity[],
  completionsMap: Map<number, Map<string, boolean>>,
  startDate: string,
  endDate: string,
  today?: string,
): number | null {
  if (!rules.length || endDate < startDate) return null;

  const ruleUptimes: number[] = [];

  for (const rule of rules) {
    const effectiveStart = startDate > rule.startDate ? startDate : rule.startDate;
    if (effectiveStart > endDate) continue;

    const periodStartsSet = new Set<string>();
    for (const d of eachDayOfInterval({ start: parseISO(effectiveStart), end: parseISO(endDate) })) {
      const [ps] = getPeriodRange(format(d, 'yyyy-MM-dd'), rule.period);
      periodStartsSet.add(ps);
    }

    let metCount = 0;
    let completedCount = 0;

    for (const periodStart of periodStartsSet) {
      const [, periodEnd] = getPeriodRange(periodStart, rule.period);
      if (today && periodEnd >= today) continue;

      completedCount++;
      const ruleMap = completionsMap.get(rule.id);
      let met: boolean;
      if (ruleMap?.has(periodStart)) {
        met = ruleMap.get(periodStart)!;
      } else {
        const periodActs = allActivities.filter(a => a.date >= periodStart && a.date <= periodEnd);
        met = isRulePeriodMet(rule, periodActs);
      }
      if (met) metCount++;
    }

    if (completedCount > 0) {
      ruleUptimes.push(Math.round((metCount / completedCount) * 100));
    }
  }

  if (!ruleUptimes.length) return null;
  return Math.round(ruleUptimes.reduce((a, b) => a + b, 0) / ruleUptimes.length);
}
