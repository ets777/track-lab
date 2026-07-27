import { addDays, differenceInDays, eachDayOfInterval, format, parseISO, subDays } from 'date-fns';
import { IActivity } from '../db/models/activity';
import { IExperiment, ExperimentResultEntry } from '../db/models/experiment';
import { ExperimentDirection } from '../db/models/experiment-indicator';
import { IRule } from '../db/models/rule';
import { getPeriodRange, isRulePeriodMet } from './rule-streak';
import { getActivityDurationMinutes } from './activity';

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
    // Tags match both directly attached tags and tags inherited from the
    // activity's actions — same semantics as rule evaluation (rule-streak.ts).
    if (subjectType === 'tag') {
      return a.tags.some(t => t.id === subjectId)
        || a.actions.some(ac => ac.tags.some(t => t.id === subjectId));
    }
    return a.items.some(i => i.id === subjectId);
  });
  const totalMin = matching.reduce((sum, a) => sum + getActivityDurationMinutes(a), 0);
  return totalMin > 0 ? Math.round((totalMin / 7) * 10) / 10 : null;
}

/** Date ranges every experiment stats calculation is based on. */
export interface ExperimentWindows {
  today: string;
  /** Week before the experiment — the preferred baseline source. */
  baselineStart: string;
  startDate: string;
  /** Fallback baseline: the experiment's own first week. */
  firstWeekEnd: string;
  /** Last week of the experiment, or the last 7 days for an ongoing one. */
  currentStart: string;
  currentEnd: string;
}

/**
 * Resolves the baseline / current date windows for an experiment.
 * Single source of truth — the widget and the view page must not derive these
 * ranges themselves, or their numbers drift apart.
 */
export function getExperimentWindows(experiment: IExperiment, now: Date = new Date()): ExperimentWindows | null {
  if (!experiment.startDate) return null;

  const today = format(now, 'yyyy-MM-dd');
  const startDate = experiment.startDate;
  const effectiveEnd = experiment.factEndDate ?? experiment.endDate;
  const currentEnd = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;

  return {
    today,
    baselineStart: format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd'),
    startDate,
    firstWeekEnd: format(addDays(parseISO(startDate), 6), 'yyyy-MM-dd'),
    currentStart: format(subDays(parseISO(currentEnd), 6), 'yyyy-MM-dd'),
    currentEnd,
  };
}

/** Elapsed share of the experiment period, 0–100. Finished experiments are always 100. */
export function computeExperimentProgress(experiment: IExperiment, now: Date = new Date()): number {
  if (experiment.factEndDate) return 100;
  if (!experiment.startDate) return 0;
  if (!experiment.endDate) return 100;

  const start = parseISO(experiment.startDate);
  const total = differenceInDays(parseISO(experiment.endDate), start);
  if (total <= 0) return 100;

  const elapsed = differenceInDays(now, start);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/** Activities grouped by the windows they were fetched for. */
export interface ExperimentActivityBuckets {
  baseline: IActivity[];
  firstWeek: IActivity[];
  current: IActivity[];
}

export interface IndicatorRawStats {
  initialRaw: number | null;
  currentRaw: number | null;
}

/**
 * Raw baseline / current values for one indicator.
 * Missing item/action/tag records count as 0 minutes, matching how finished
 * experiments are evaluated in ExperimentService.evaluateResult.
 */
export function computeIndicatorRawStats(
  subjectType: ExperimentSubjectType,
  subjectId: number,
  buckets: ExperimentActivityBuckets,
): IndicatorRawStats {
  if (subjectType === 'metric') {
    return {
      initialRaw: averageMetricValue(buckets.baseline, subjectId) ?? averageMetricValue(buckets.firstWeek, subjectId),
      currentRaw: averageMetricValue(buckets.current, subjectId),
    };
  }

  const type = subjectType as Exclude<ExperimentSubjectType, 'metric'>;
  return {
    initialRaw: averageMinutesPerDay(buckets.baseline, type, subjectId)
      ?? averageMinutesPerDay(buckets.firstWeek, type, subjectId)
      ?? 0,
    currentRaw: averageMinutesPerDay(buckets.current, type, subjectId) ?? 0,
  };
}

/**
 * Stored values for a finished experiment, or null when nothing was saved for
 * this indicator. Finished experiments must read these instead of recomputing —
 * later activity edits would otherwise change a settled result.
 */
export function storedIndicatorRawStats(
  resultData: string | null,
  subjectType: ExperimentSubjectType,
  subjectId: number,
): IndicatorRawStats | null {
  if (!resultData) return null;

  let entries: ExperimentResultEntry[];
  try {
    entries = JSON.parse(resultData);
  } catch {
    return null;
  }
  if (!Array.isArray(entries)) return null;

  const entry = entries.find(e => e.indicatorType === subjectType && e.indicatorId === subjectId);
  if (!entry) return null;

  return { initialRaw: entry.initialValue ?? null, currentRaw: entry.resultValue ?? null };
}

export interface IndicatorComparison {
  /** null when there is nothing to compare or the value did not change. */
  arrowUp: boolean | null;
  /** Whether the change moved towards the indicator's goal. */
  outcome: 'good' | 'bad' | 'neutral';
}

/** Compares baseline against current for one indicator's declared direction. */
export function compareIndicator(
  direction: ExperimentDirection,
  initialRaw: number | null,
  currentRaw: number | null,
): IndicatorComparison {
  if (initialRaw === null || currentRaw === null || currentRaw === initialRaw) {
    return { arrowUp: null, outcome: 'neutral' };
  }

  const arrowUp = currentRaw > initialRaw;
  if (direction === 'increasing') return { arrowUp, outcome: arrowUp ? 'good' : 'bad' };
  if (direction === 'decreasing') return { arrowUp, outcome: arrowUp ? 'bad' : 'good' };
  return { arrowUp, outcome: 'neutral' };
}

/** Display string for an indicator value. `null` renders as "??" (never logged). */
export function formatIndicatorValue(raw: number | null, unit: string): string {
  if (raw === null) return '??';
  return `${Math.round(raw * 10) / 10}${unit}`;
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
