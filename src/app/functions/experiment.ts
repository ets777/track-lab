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
 * Percentage of days within [startDate, endDate] where every rule was met.
 * Days equal to excludeDate (typically today, still incomplete) are not counted.
 */
export function computeExperimentUptime(
  rules: IRule[],
  allActivities: IActivity[],
  completionsMap: Map<number, Map<string, boolean>>,
  startDate: string,
  endDate: string,
  excludeDate?: string,
): number | null {
  if (!rules.length || endDate < startDate) return null;

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    .map(d => format(d, 'yyyy-MM-dd'));

  const periodCache = new Map<string, boolean>();

  const isRuleMetForDay = (rule: IRule, day: string): boolean => {
    if (day < rule.startDate) return true;
    const [periodStart, periodEnd] = getPeriodRange(day, rule.period);
    const cacheKey = `${rule.id}:${periodStart}`;
    if (periodCache.has(cacheKey)) return periodCache.get(cacheKey)!;
    const ruleMap = completionsMap.get(rule.id);
    let result: boolean;
    if (ruleMap?.has(periodStart)) {
      result = ruleMap.get(periodStart)!;
    } else {
      const periodActs = allActivities.filter(a => a.date >= periodStart && a.date <= periodEnd);
      result = isRulePeriodMet(rule, periodActs);
    }
    periodCache.set(cacheKey, result);
    return result;
  };

  const countedDays = days.filter(d => d !== excludeDate);
  if (!countedDays.length) return null;

  const goodCount = countedDays.filter(day => rules.every(rule => isRuleMetForDay(rule, day))).length;
  return Math.round((goodCount / countedDays.length) * 100);
}
