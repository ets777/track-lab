import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, isAfter, eachDayOfInterval, subDays } from 'date-fns';
import { IRule } from '../db/models/rule';
import { IActivity } from '../db/models/activity';
import { IRuleCompletionDb } from '../db/models/rule-completion';
import { getActivityDurationMinutes } from './activity';

export function getPeriodRange(date: string, period: IRule['period']): [string, string] {
  if (period === 'day') return [date, date];
  const d = parseISO(date);
  if (period === 'week') {
    return [
      format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    ];
  }
  return [format(startOfMonth(d), 'yyyy-MM-dd'), format(endOfMonth(d), 'yyyy-MM-dd')];
}

export function matchesRule(activity: IActivity, rule: IRule): boolean {
  if (activity.date < rule.startDate) return false;
  let subjectMatch = false;
  if (rule.subjectType === 'action') {
    subjectMatch = activity.actions.some(a => a.id === rule.subjectId);
  } else if (rule.subjectType === 'tag') {
    subjectMatch = activity.tags.some(t => t.id === rule.subjectId)
      || activity.actions.some(a => a.tags.some(t => t.id === rule.subjectId));
  } else {
    subjectMatch = activity.items.some(i => i.id === rule.subjectId);
  }
  if (!subjectMatch) return false;
  if (rule.startTime && rule.endTime) {
    const actEnd = activity.endTime ?? activity.startTime;
    if (activity.startTime >= rule.endTime || actEnd <= rule.startTime) return false;
  }
  return true;
}

export function computeMetric(activities: IActivity[], rule: IRule): number {
  if (rule.metric === 'count') return activities.length;
  if (rule.metric === 'totalDuration') return activities.reduce((s, a) => s + getActivityDurationMinutes(a), 0);
  return new Set(activities.map(a => a.date)).size;
}

export function isMet(value: number, rule: IRule): boolean {
  if (rule.value === 0) return value === 0;
  return rule.operator === '>=' ? value >= rule.value : value <= rule.value;
}

export function isRulePeriodMet(rule: IRule, activities: IActivity[]): boolean {
  const matching = activities.filter(a => matchesRule(a, rule));
  return isMet(computeMetric(matching, rule), rule);
}

export function getCompletedPeriods(rule: IRule, today: string): [string, string][] {
  const periods: [string, string][] = [];

  if (rule.period === 'day') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const endStr = format(yesterday, 'yyyy-MM-dd');
    if (endStr < rule.startDate) return periods;
    for (const d of eachDayOfInterval({ start: parseISO(rule.startDate), end: parseISO(endStr) })) {
      const s = format(d, 'yyyy-MM-dd');
      periods.push([s, s]);
    }
  } else if (rule.period === 'week') {
    let wStart = startOfWeek(parseISO(rule.startDate), { weekStartsOn: 1 });
    const todayWStart = startOfWeek(parseISO(today), { weekStartsOn: 1 });
    while (isAfter(todayWStart, wStart)) {
      periods.push([
        format(wStart, 'yyyy-MM-dd'),
        format(endOfWeek(wStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      ]);
      wStart = addWeeks(wStart, 1);
    }
  } else {
    let mStart = startOfMonth(parseISO(rule.startDate));
    const todayMStart = startOfMonth(parseISO(today));
    while (isAfter(todayMStart, mStart)) {
      periods.push([
        format(mStart, 'yyyy-MM-dd'),
        format(endOfMonth(mStart), 'yyyy-MM-dd'),
      ]);
      mStart = addMonths(mStart, 1);
    }
  }

  return periods;
}

/**
 * Streak using archived completions for periods > 31 days old + live activities for recent periods.
 * recentActivities must cover at least the last 32 days.
 */
export function computeRuleStreakWithCompletions(
  rule: IRule,
  completions: IRuleCompletionDb[],
  recentActivities: IActivity[],
): number {
  const today = format(new Date(), 'yyyy-MM-dd');
  const archiveCutoff = format(subDays(new Date(), 31), 'yyyy-MM-dd');

  const allPeriods = getCompletedPeriods(rule, today);
  const archivablePeriods = allPeriods.filter(([, end]) => end <= archiveCutoff);
  const recentPeriods = allPeriods.filter(([, end]) => end > archiveCutoff);

  const completionMap = new Map(completions.map(c => [c.periodStart, c.met === 1]));
  const archivedStatuses = archivablePeriods.map(([start]) => completionMap.get(start) ?? false);

  const recentStatuses = recentPeriods.map(([start, end]) => {
    const periodActivities = recentActivities.filter(a => a.date >= start && a.date <= end && matchesRule(a, rule));
    return isMet(computeMetric(periodActivities, rule), rule);
  });

  const allStatuses = [...archivedStatuses, ...recentStatuses];

  let streak = 0;
  let i = allStatuses.length - 1;
  while (i >= 0 && allStatuses[i]) { streak++; i--; }

  const canExtend = allStatuses.length === 0 || allStatuses[allStatuses.length - 1];
  if (canExtend) {
    const [curStart, curEnd] = getPeriodRange(today, rule.period);
    const curActivities = recentActivities.filter(a => a.date >= curStart && a.date <= curEnd && matchesRule(a, rule));
    if (isMet(computeMetric(curActivities, rule), rule)) streak++;
  }

  return streak;
}

export function computeRuleStreak(rule: IRule, activities: IActivity[]): number {
  const today = format(new Date(), 'yyyy-MM-dd');
  const completedPeriods = getCompletedPeriods(rule, today);

  const completedStatuses = completedPeriods.map(([start, end]) => {
    const periodActivities = activities.filter(a => a.date >= start && a.date <= end && matchesRule(a, rule));
    return isMet(computeMetric(periodActivities, rule), rule);
  });

  let streak = 0;
  let i = completedStatuses.length - 1;
  while (i >= 0 && completedStatuses[i]) { streak++; i--; }

  const canExtend = completedStatuses.length === 0 || completedStatuses[completedStatuses.length - 1];
  if (canExtend) {
    const [curStart, curEnd] = getPeriodRange(today, rule.period);
    const curActivities = activities.filter(a => a.date >= curStart && a.date <= curEnd && matchesRule(a, rule));
    if (isMet(computeMetric(curActivities, rule), rule)) streak++;
  }

  return streak;
}
