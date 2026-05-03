import { IActivity } from '../db/models/activity';
import { IRule, RulePeriod } from '../db/models/rule';

export type RuleColor = 'green' | 'red';
export type DayStatus = RuleColor | null;

export interface ActivityRuleResult {
  color: RuleColor;
  rule: IRule;
}

export interface RuleDayStatus {
  rule: IRule;
  color: RuleColor;
  progress: { current: number; target: number } | null;
}

export function computeRuleStatusesForDay(
  date: string,
  allActivities: IActivity[],
  rules: IRule[],
): RuleDayStatus[] {
  return rules
    .filter(r => r.startDate <= getPeriodEndDate(date, r.period))
    .map(rule => ({
      rule,
      color: ruleColorForDay(date, allActivities, rule),
      progress: computeRuleProgress(date, allActivities, rule),
    }));
}

function computeRuleProgress(
  date: string,
  allActivities: IActivity[],
  rule: IRule,
): { current: number; target: number } | null {
  if (rule.value === 0) return null;
  const periodKey = getPeriodKey(date, rule.period);
  const periodActivities = allActivities.filter(
    a => activityMatchesRule(a, rule) && getPeriodKey(a.date, rule.period) === periodKey,
  );
  return { current: computeMetricTotal(periodActivities, rule), target: rule.value };
}

export function computeDayStatusMap(
  dates: string[],
  allActivities: IActivity[],
  rules: IRule[],
): Map<string, DayStatus> {
  const map = new Map<string, DayStatus>();
  for (const date of dates) {
    const active = rules.filter(r => r.startDate <= date);
    if (!active.length) { map.set(date, null); continue; }
    const hasRed = active.some(r => ruleColorForDay(date, allActivities, r) === 'red');
    map.set(date, hasRed ? 'red' : 'green');
  }
  return map;
}

function ruleColorForDay(date: string, allActivities: IActivity[], rule: IRule): RuleColor {
  const periodKey = getPeriodKey(date, rule.period);
  const periodActivities = allActivities.filter(
    a => activityMatchesRule(a, rule) && getPeriodKey(a.date, rule.period) === periodKey,
  );

  if (rule.value === 0) return periodActivities.length > 0 ? 'red' : 'green';

  const metric = computeMetricTotal(periodActivities, rule);
  return rule.operator === '>=' ? (metric >= rule.value ? 'green' : 'red') : (metric <= rule.value ? 'green' : 'red');
}

function computeMetricTotal(activities: IActivity[], rule: IRule): number {
  if (rule.metric === 'count') return activities.length;
  if (rule.metric === 'countDays') return new Set(activities.map(a => a.date)).size;
  return activities.reduce((s, a) => s + getDurationMinutes(a), 0);
}

export function computeRuleResultsForActivity(
  target: IActivity,
  allActivities: IActivity[],
  rules: IRule[],
): ActivityRuleResult[] {
  const results: ActivityRuleResult[] = [];

  for (const rule of rules) {
    const matching = allActivities.filter(a => activityMatchesRule(a, rule));
    if (!matching.some(a => a.id === target.id)) continue;

    if (rule.value === 0) {
      results.push({ color: 'red', rule });
      continue;
    }

    if (rule.operator === '>=') {
      results.push({ color: 'green', rule });
      continue;
    }

    // '<=' — check if target lands in red zone
    const byPeriod = groupByPeriod(matching, rule.period);
    const targetKey = getPeriodKey(target.date, rule.period);
    const group = byPeriod.get(targetKey);
    if (!group) continue;

    const sorted = [...group].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });

    let isRed = false;
    if (rule.metric === 'totalDuration') {
      let total = 0;
      for (const a of sorted) {
        total += getDurationMinutes(a);
        if (a.id === target.id) { isRed = total > rule.value; break; }
      }
    } else if (rule.metric === 'countDays') {
      const seenDates = new Set<string>();
      for (const a of sorted) {
        if (!seenDates.has(a.date)) seenDates.add(a.date);
        if (a.id === target.id) { isRed = seenDates.size > rule.value; break; }
      }
    } else {
      const idx = sorted.findIndex(a => a.id === target.id);
      isRed = idx >= rule.value;
    }

    if (isRed) results.push({ color: 'red', rule });
  }

  return results;
}

export function computeActivityRuleResults(
  activities: IActivity[],
  rules: IRule[],
): Map<number, ActivityRuleResult> {
  const resultMap = new Map<number, ActivityRuleResult>();

  const set = (activityId: number, color: RuleColor, rule: IRule) => {
    const existing = resultMap.get(activityId);
    if (!existing || beats(color, rule.id, existing)) {
      resultMap.set(activityId, { color, rule });
    }
  };

  for (const rule of rules) {
    const matching = activities.filter(a => activityMatchesRule(a, rule));
    if (!matching.length) continue;

    if (rule.value === 0) {
      for (const a of matching) set(a.id, 'red', rule);
      continue;
    }

    if (rule.operator === '>=') {
      for (const a of matching) set(a.id, 'green', rule);
      continue;
    }

    // '<=' — group by period, sort by time, red from index N onward
    const byPeriod = groupByPeriod(matching, rule.period);
    for (const group of byPeriod.values()) {
      const sorted = [...group].sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      });

      if (rule.metric === 'totalDuration') {
        let total = 0;
        for (const a of sorted) {
          total += getDurationMinutes(a);
          if (total > rule.value) set(a.id, 'red', rule);
        }
      } else if (rule.metric === 'countDays') {
        const seenDates = new Set<string>();
        for (const a of sorted) {
          if (!seenDates.has(a.date)) seenDates.add(a.date);
          if (seenDates.size > rule.value) set(a.id, 'red', rule);
        }
      } else {
        sorted.forEach((a, i) => { if (i >= rule.value) set(a.id, 'red', rule); });
      }
    }
  }

  return resultMap;
}

/** red beats green; same color → higher id wins */
function beats(color: RuleColor, id: number, existing: ActivityRuleResult): boolean {
  if (color === 'red' && existing.color === 'green') return true;
  if (color === 'green' && existing.color === 'red') return false;
  return id > existing.rule.id;
}

function activityMatchesRule(activity: IActivity, rule: IRule): boolean {
  if (activity.date < rule.startDate) return false;
  if (!matchesSubject(activity, rule)) return false;
  if (rule.startTime && rule.endTime && !overlapsTimeRange(activity, rule.startTime, rule.endTime)) return false;
  return true;
}

function matchesSubject(activity: IActivity, rule: IRule): boolean {
  switch (rule.subjectType) {
    case 'action':
      return activity.actions.some(a => a.id === rule.subjectId);
    case 'tag':
      return activity.tags.some(t => t.id === rule.subjectId)
        || activity.actions.some(a => a.tags.some(t => t.id === rule.subjectId));
    case 'item':
      return activity.items.some(i => i.id === rule.subjectId);
  }
}

function overlapsTimeRange(activity: IActivity, ruleStart: string, ruleEnd: string): boolean {
  const actStart = activity.startTime;
  const actEnd = activity.endTime ?? activity.startTime;
  return actStart < ruleEnd && actEnd > ruleStart;
}

function groupByPeriod(activities: IActivity[], period: RulePeriod): Map<string, IActivity[]> {
  const map = new Map<string, IActivity[]>();
  for (const a of activities) {
    const key = getPeriodKey(a.date, period);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

function getPeriodKey(date: string, period: RulePeriod): string {
  switch (period) {
    case 'day': return date;
    case 'month': return date.slice(0, 7);
    case 'week': {
      const d = new Date(date + 'T00:00:00');
      const dayOfWeek = (d.getDay() + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - dayOfWeek);
      return monday.toISOString().slice(0, 10);
    }
  }
}

function getPeriodEndDate(date: string, period: RulePeriod): string {
  if (period === 'day') return date;
  const d = new Date(date + 'T00:00:00');
  if (period === 'week') {
    const dayOfWeek = (d.getDay() + 6) % 7;
    const sunday = new Date(d);
    sunday.setDate(d.getDate() + (6 - dayOfWeek));
    return sunday.toISOString().slice(0, 10);
  }
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function getDurationMinutes(activity: IActivity): number {
  if (!activity.endTime) return 0;
  const [sh, sm] = activity.startTime.split(':').map(Number);
  const [eh, em] = activity.endTime.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}
