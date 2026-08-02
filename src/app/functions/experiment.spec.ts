import { IActivity } from '../db/models/activity';
import { IExperiment } from '../db/models/experiment';
import { IRule } from '../db/models/rule';
import {
  averageMetricValue,
  averageMinutesPerDay,
  compareIndicator,
  computeExperimentProgress,
  computeExperimentUptime,
  computeIndicatorRawStats,
  formatIndicatorValue,
  getExperimentWindows,
  storedIndicatorRawStats,
} from './experiment';

function activity(partial: Partial<IActivity> = {}): IActivity {
  return {
    id: 1,
    date: '2026-01-10',
    startTime: '10:00',
    endTime: '11:00',
    actions: [],
    tags: [],
    items: [],
    metricRecords: [],
    ...partial,
  } as IActivity;
}

function experiment(partial: Partial<IExperiment> = {}): IExperiment {
  return {
    id: 1,
    title: 'Test',
    startDate: '2026-01-10',
    endDate: '2026-01-24',
    factEndDate: null,
    isSuccess: null,
    failReasonId: null,
    resultData: null,
    ...partial,
  };
}

function rule(partial: Partial<IRule> = {}): IRule {
  return {
    id: 1,
    subjectType: 'action',
    subjectId: 1,
    metric: 'count',
    operator: '>=',
    value: 1,
    period: 'day',
    startDate: '2026-01-10',
    endDate: null,
    startTime: null,
    endTime: null,
    ...partial,
  };
}

describe('averageMetricValue', () => {
  it('averages recorded values for the requested metric only', () => {
    const acts = [
      activity({ metricRecords: [{ metricId: 1, value: 10 }, { metricId: 2, value: 99 }] as never }),
      activity({ metricRecords: [{ metricId: 1, value: 20 }] as never }),
    ];
    expect(averageMetricValue(acts, 1)).toBe(15);
  });

  it('ignores null values instead of counting them as records', () => {
    const acts = [
      activity({ metricRecords: [{ metricId: 1, value: 10 }] as never }),
      activity({ metricRecords: [{ metricId: 1, value: null }] as never }),
    ];
    expect(averageMetricValue(acts, 1)).toBe(10);
  });

  it('returns null when the metric was never logged', () => {
    expect(averageMetricValue([activity()], 1)).toBeNull();
  });
});

describe('averageMinutesPerDay', () => {
  it('spreads total duration across a 7-day week', () => {
    const acts = [
      activity({ startTime: '10:00', endTime: '11:00', actions: [{ id: 1, tags: [] }] as never }),
      activity({ startTime: '12:00', endTime: '12:30', actions: [{ id: 1, tags: [] }] as never }),
    ];
    // 90 minutes over 7 days
    expect(averageMinutesPerDay(acts, 'action', 1)).toBe(12.9);
  });

  it('matches tags inherited from the activity actions, not just direct tags', () => {
    const viaAction = [activity({ actions: [{ id: 5, tags: [{ id: 7 }] }] as never })];
    const direct = [activity({ tags: [{ id: 7 }] as never })];

    expect(averageMinutesPerDay(viaAction, 'tag', 7)).toBe(8.6);
    expect(averageMinutesPerDay(direct, 'tag', 7)).toBe(8.6);
  });

  it('skips activities with no end time', () => {
    const acts = [activity({ endTime: undefined, actions: [{ id: 1, tags: [] }] as never })];
    expect(averageMinutesPerDay(acts, 'action', 1)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(averageMinutesPerDay([activity()], 'item', 3)).toBeNull();
  });
});

describe('getExperimentWindows', () => {
  const now = new Date('2026-01-20T12:00:00');

  it('uses the week before the start as the baseline window', () => {
    const w = getExperimentWindows(experiment(), now)!;
    expect(w.baselineStart).toBe('2026-01-04');
    expect(w.startDate).toBe('2026-01-10');
    expect(w.firstWeekEnd).toBe('2026-01-16');
  });

  it('ends an ongoing experiment window at today', () => {
    const w = getExperimentWindows(experiment(), now)!;
    expect(w.currentEnd).toBe('2026-01-20');
    expect(w.currentStart).toBe('2026-01-14');
  });

  it('ends a finished experiment window at factEndDate', () => {
    const w = getExperimentWindows(experiment({ factEndDate: '2026-01-15' }), now)!;
    expect(w.currentEnd).toBe('2026-01-15');
    expect(w.currentStart).toBe('2026-01-09');
  });

  it('returns null without a start date', () => {
    expect(getExperimentWindows(experiment({ startDate: null }), now)).toBeNull();
  });
});

describe('computeExperimentProgress', () => {
  it('reports the share of finished days', () => {
    // Jan 10–24 is a 15-day experiment; by Jan 17, 7 days are behind → 7/15
    expect(computeExperimentProgress(experiment(), new Date('2026-01-17T12:00:00'))).toBe(47);
  });

  it('opens at 0 on the first day and does not reach 100 on the last', () => {
    // Two-day experiment: day 1 → 0/2, day 2 (the last) → 1/2
    const exp = experiment({ startDate: '2026-01-10', endDate: '2026-01-11' });
    expect(computeExperimentProgress(exp, new Date('2026-01-10T12:00:00'))).toBe(0);
    expect(computeExperimentProgress(exp, new Date('2026-01-11T23:00:00'))).toBe(50);
  });

  it('reaches 100 the day after the end date', () => {
    const exp = experiment({ startDate: '2026-01-10', endDate: '2026-01-11' });
    expect(computeExperimentProgress(exp, new Date('2026-01-12T00:30:00'))).toBe(100);
  });

  it('gives a one-day experiment 0 on its only day and 100 the next', () => {
    const exp = experiment({ startDate: '2026-01-10', endDate: '2026-01-10' });
    expect(computeExperimentProgress(exp, new Date('2026-01-10T12:00:00'))).toBe(0);
    expect(computeExperimentProgress(exp, new Date('2026-01-11T12:00:00'))).toBe(100);
  });

  it('reports 100 for a finished experiment regardless of the planned end', () => {
    const exp = experiment({ factEndDate: '2026-01-12' });
    expect(computeExperimentProgress(exp, new Date('2026-01-13T12:00:00'))).toBe(100);
  });

  it('clamps to 0 before the experiment starts', () => {
    expect(computeExperimentProgress(experiment(), new Date('2026-01-01T12:00:00'))).toBe(0);
  });

  it('clamps to 100 past the planned end', () => {
    expect(computeExperimentProgress(experiment(), new Date('2026-02-20T12:00:00'))).toBe(100);
  });

  it('treats an open-ended experiment as complete', () => {
    expect(computeExperimentProgress(experiment({ endDate: null }), new Date('2026-01-12T12:00:00'))).toBe(100);
  });
});

describe('computeIndicatorRawStats', () => {
  const metricAct = (value: number) => activity({ metricRecords: [{ metricId: 1, value }] as never });

  it('falls back to the first experiment week when there is no pre-experiment baseline', () => {
    const stats = computeIndicatorRawStats('metric', 1, {
      baseline: [],
      firstWeek: [metricAct(80)],
      current: [metricAct(70)],
    });
    expect(stats).toEqual({ initialRaw: 80, currentRaw: 70 });
  });

  it('prefers the pre-experiment baseline when it exists', () => {
    const stats = computeIndicatorRawStats('metric', 1, {
      baseline: [metricAct(90)],
      firstWeek: [metricAct(80)],
      current: [metricAct(70)],
    });
    expect(stats.initialRaw).toBe(90);
  });

  it('counts unlogged action time as 0 rather than unknown', () => {
    const stats = computeIndicatorRawStats('action', 1, { baseline: [], firstWeek: [], current: [] });
    expect(stats).toEqual({ initialRaw: 0, currentRaw: 0 });
  });

  it('leaves unlogged metrics unknown', () => {
    const stats = computeIndicatorRawStats('metric', 1, { baseline: [], firstWeek: [], current: [] });
    expect(stats).toEqual({ initialRaw: null, currentRaw: null });
  });
});

describe('storedIndicatorRawStats', () => {
  const stored = JSON.stringify([
    { indicatorType: 'metric', indicatorId: 1, initialValue: 80, resultValue: 74 },
    { indicatorType: 'action', indicatorId: 1, initialValue: 0, resultValue: 30 },
  ]);

  it('returns the saved values for a finished experiment', () => {
    expect(storedIndicatorRawStats(stored, 'metric', 1)).toEqual({ initialRaw: 80, currentRaw: 74 });
  });

  it('distinguishes indicators that share an id but differ in type', () => {
    expect(storedIndicatorRawStats(stored, 'action', 1)).toEqual({ initialRaw: 0, currentRaw: 30 });
  });

  it('returns null for an indicator that was not saved', () => {
    expect(storedIndicatorRawStats(stored, 'tag', 1)).toBeNull();
  });

  it('returns null when there is no stored result', () => {
    expect(storedIndicatorRawStats(null, 'metric', 1)).toBeNull();
  });

  it('returns null instead of throwing on corrupted result data', () => {
    expect(storedIndicatorRawStats('not json', 'metric', 1)).toBeNull();
  });
});

describe('compareIndicator', () => {
  it('marks a rise as good for an increasing indicator', () => {
    expect(compareIndicator('increasing', 10, 20)).toEqual({ arrowUp: true, outcome: 'good' });
  });

  it('marks a rise as bad for a decreasing indicator', () => {
    expect(compareIndicator('decreasing', 10, 20)).toEqual({ arrowUp: true, outcome: 'bad' });
  });

  it('shows the direction but no verdict for an "any" indicator', () => {
    expect(compareIndicator('any', 10, 20)).toEqual({ arrowUp: true, outcome: 'neutral' });
    expect(compareIndicator('any', 20, 10)).toEqual({ arrowUp: false, outcome: 'neutral' });
  });

  it('reports no arrow when the value did not change', () => {
    expect(compareIndicator('increasing', 10, 10)).toEqual({ arrowUp: null, outcome: 'neutral' });
  });

  it('reports no arrow when either side is unknown', () => {
    expect(compareIndicator('increasing', null, 10)).toEqual({ arrowUp: null, outcome: 'neutral' });
    expect(compareIndicator('increasing', 10, null)).toEqual({ arrowUp: null, outcome: 'neutral' });
  });
});

describe('formatIndicatorValue', () => {
  it('rounds to one decimal and appends the unit', () => {
    expect(formatIndicatorValue(74.26, ' kg')).toBe('74.3 kg');
  });

  it('renders unknown values as ??', () => {
    expect(formatIndicatorValue(null, ' kg')).toBe('??');
  });
});

describe('widget / view parity', () => {
  // Both surfaces must derive identical numbers. They used to duplicate this
  // logic and drifted apart; these assertions pin them to one implementation.
  const buckets = {
    baseline: [activity({ tags: [{ id: 7 }] as never, startTime: '10:00', endTime: '11:00' })],
    firstWeek: [],
    current: [activity({ actions: [{ id: 5, tags: [{ id: 7 }] }] as never, startTime: '10:00', endTime: '12:00' })],
  };

  it('produces the same tag stats regardless of how the tag was attached', () => {
    const stats = computeIndicatorRawStats('tag', 7, buckets);
    expect(stats.initialRaw).toBe(8.6);
    expect(stats.currentRaw).toBe(17.1);
  });

  it('prefers stored results over recomputation once an experiment is finished', () => {
    const finished = experiment({
      factEndDate: '2026-01-20',
      resultData: JSON.stringify([{ indicatorType: 'tag', indicatorId: 7, initialValue: 8.6, resultValue: 5 }]),
    });

    const stored = storedIndicatorRawStats(finished.resultData, 'tag', 7)!;
    const recomputed = computeIndicatorRawStats('tag', 7, buckets);

    expect(stored.currentRaw).toBe(5);
    expect(stored.currentRaw).not.toBe(recomputed.currentRaw);
  });
});

describe('computeExperimentUptime', () => {
  const completions = (entries: [string, boolean][]) => new Map([[1, new Map(entries)]]);

  it('scores completed periods from the completions map', () => {
    const uptime = computeExperimentUptime(
      [rule()],
      [],
      completions([['2026-01-10', true], ['2026-01-11', false], ['2026-01-12', true]]),
      '2026-01-10',
      '2026-01-12',
      '2026-01-13',
    );
    expect(uptime).toBe(67);
  });

  it('excludes periods that are still in progress', () => {
    const uptime = computeExperimentUptime(
      [rule()],
      [],
      completions([['2026-01-10', true], ['2026-01-11', false]]),
      '2026-01-10',
      '2026-01-11',
      '2026-01-11',
    );
    // 2026-01-11 is today, so only the first day counts
    expect(uptime).toBe(100);
  });

  it('starts counting at the rule start date when it is later than the experiment', () => {
    const uptime = computeExperimentUptime(
      [rule({ startDate: '2026-01-12' })],
      [],
      completions([['2026-01-10', false], ['2026-01-12', true]]),
      '2026-01-10',
      '2026-01-12',
      '2026-01-13',
    );
    expect(uptime).toBe(100);
  });

  it('averages across rules rather than across periods', () => {
    const map = new Map([
      [1, new Map([['2026-01-10', true], ['2026-01-11', true]])],
      [2, new Map([['2026-01-10', false], ['2026-01-11', false]])],
    ]);
    const uptime = computeExperimentUptime(
      [rule(), rule({ id: 2 })],
      [],
      map,
      '2026-01-10',
      '2026-01-11',
      '2026-01-12',
    );
    expect(uptime).toBe(50);
  });

  it('returns null when there are no rules', () => {
    expect(computeExperimentUptime([], [], new Map(), '2026-01-10', '2026-01-12', '2026-01-13')).toBeNull();
  });

  it('returns null when no period has completed yet', () => {
    expect(computeExperimentUptime([rule()], [], new Map(), '2026-01-10', '2026-01-10', '2026-01-10')).toBeNull();
  });
});
