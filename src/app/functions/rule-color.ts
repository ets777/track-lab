import { IActivity } from '../db/models/activity';
import { IRule, RulePeriod } from '../db/models/rule';
import { matchesRule, computeMetric, isMet } from './rule-streak';
import { getActivityDurationMinutes } from './activity';
import { endOfLocalWeek, formatLocalDate, parseLocalDate, startOfLocalWeek } from './date';

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
    a => matchesRule(a, rule) && getPeriodKey(a.date, rule.period) === periodKey,
  );
  return { current: computeMetric(periodActivities, rule), target: rule.value };
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
    a => matchesRule(a, rule) && getPeriodKey(a.date, rule.period) === periodKey,
  );
  return isMet(computeMetric(periodActivities, rule), rule) ? 'green' : 'red';
}

export function computeRuleResultsForActivity(
  target: IActivity,
  allActivities: IActivity[],
  rules: IRule[],
): ActivityRuleResult[] {
  const results: ActivityRuleResult[] = [];

  for (const rule of rules) {
    const matching = allActivities.filter(a => matchesRule(a, rule));
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
        total += getActivityDurationMinutes(a);
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
    const matching = activities.filter(a => matchesRule(a, rule));
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
          total += getActivityDurationMinutes(a);
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
    case 'week': return startOfLocalWeek(date);
  }
}

function getPeriodEndDate(date: string, period: RulePeriod): string {
  if (period === 'day') return date;
  if (period === 'week') return endOfLocalWeek(date);
  const d = parseLocalDate(date);
  if (!d) return date;
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
