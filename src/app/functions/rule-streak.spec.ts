import { IActivity } from '../db/models/activity';
import { IRule } from '../db/models/rule';
import {
  computeMetric,
  getCompletedPeriods,
  getPeriodRange,
  isMet,
  isRuleActiveOn,
  isRuleClosed,
  isRulePeriodMet,
  matchesRule,
} from './rule-streak';

function activity(partial: Partial<IActivity> = {}): IActivity {
  return {
    id: 1,
    date: '2026-01-14',
    startTime: '10:00',
    endTime: '11:00',
    actions: [],
    tags: [],
    items: [],
    metricRecords: [],
    ...partial,
  } as IActivity;
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
    startDate: '2026-01-01',
    endDate: null,
    startTime: null,
    endTime: null,
    ...partial,
  };
}

describe('getPeriodRange', () => {
  it('returns the same day for a daily rule', () => {
    expect(getPeriodRange('2026-01-14', 'day')).toEqual(['2026-01-14', '2026-01-14']);
  });

  it('returns a Monday-to-Sunday week', () => {
    // 2026-01-14 is a Wednesday
    expect(getPeriodRange('2026-01-14', 'week')).toEqual(['2026-01-12', '2026-01-18']);
  });

  it('returns the calendar month', () => {
    expect(getPeriodRange('2026-02-14', 'month')).toEqual(['2026-02-01', '2026-02-28']);
  });
});

describe('isRuleActiveOn', () => {
  it('is open-ended when no end date is set', () => {
    expect(isRuleActiveOn(rule(), '2099-01-01')).toBe(true);
  });

  it('covers the end date itself', () => {
    expect(isRuleActiveOn(rule({ endDate: '2026-07-31' }), '2026-07-31')).toBe(true);
  });

  it('stops the day after the end date', () => {
    expect(isRuleActiveOn(rule({ endDate: '2026-07-31' }), '2026-08-01')).toBe(false);
  });
});

describe('isRuleClosed', () => {
  it('is not closed on its last day', () => {
    expect(isRuleClosed(rule({ endDate: '2026-07-31' }), '2026-07-31')).toBe(false);
  });

  it('is closed once the end date has passed', () => {
    expect(isRuleClosed(rule({ endDate: '2026-07-31' }), '2026-08-01')).toBe(true);
  });

  it('is never closed without an end date', () => {
    expect(isRuleClosed(rule(), '2099-01-01')).toBe(false);
  });
});

describe('matchesRule', () => {
  it('ignores activities logged after the rule ended', () => {
    const act = activity({ date: '2026-08-01', actions: [{ id: 1, tags: [] }] as never });
    expect(matchesRule(act, rule({ endDate: '2026-07-31' }))).toBe(false);
  });

  it('still counts an activity logged on the end date', () => {
    const act = activity({ date: '2026-07-31', actions: [{ id: 1, tags: [] }] as never });
    expect(matchesRule(act, rule({ endDate: '2026-07-31' }))).toBe(true);
  });

  it('ignores activities logged before the rule existed', () => {
    const act = activity({ date: '2025-12-31', actions: [{ id: 1, tags: [] }] as never });
    expect(matchesRule(act, rule())).toBe(false);
  });

  it('matches a tag attached directly to the activity', () => {
    const act = activity({ tags: [{ id: 7 }] as never });
    expect(matchesRule(act, rule({ subjectType: 'tag', subjectId: 7 }))).toBe(true);
  });

  it('matches a tag inherited from one of the activity actions', () => {
    const act = activity({ actions: [{ id: 1, tags: [{ id: 7 }] }] as never });
    expect(matchesRule(act, rule({ subjectType: 'tag', subjectId: 7 }))).toBe(true);
  });

  it('matches an item', () => {
    const act = activity({ items: [{ id: 3 }] as never });
    expect(matchesRule(act, rule({ subjectType: 'item', subjectId: 3 }))).toBe(true);
  });

  it('rejects an activity that ends before the rule time window opens', () => {
    const act = activity({
      startTime: '06:00',
      endTime: '07:00',
      actions: [{ id: 1, tags: [] }] as never,
    });
    expect(matchesRule(act, rule({ startTime: '09:00', endTime: '17:00' }))).toBe(false);
  });

  it('accepts an activity that overlaps the rule time window', () => {
    const act = activity({
      startTime: '08:00',
      endTime: '10:00',
      actions: [{ id: 1, tags: [] }] as never,
    });
    expect(matchesRule(act, rule({ startTime: '09:00', endTime: '17:00' }))).toBe(true);
  });

  it('treats an open-ended activity as a point in time for the window check', () => {
    const act = activity({
      startTime: '18:00',
      endTime: undefined,
      actions: [{ id: 1, tags: [] }] as never,
    });
    expect(matchesRule(act, rule({ startTime: '09:00', endTime: '17:00' }))).toBe(false);
  });
});

describe('computeMetric', () => {
  const acts = [
    activity({ date: '2026-01-14', startTime: '10:00', endTime: '11:00' }),
    activity({ date: '2026-01-14', startTime: '12:00', endTime: '12:30' }),
    activity({ date: '2026-01-15', startTime: '10:00', endTime: '10:15' }),
  ];

  it('counts activities', () => {
    expect(computeMetric(acts, rule({ metric: 'count' }))).toBe(3);
  });

  it('sums duration in minutes', () => {
    expect(computeMetric(acts, rule({ metric: 'totalDuration' }))).toBe(105);
  });

  it('counts distinct days, not activities', () => {
    expect(computeMetric(acts, rule({ metric: 'countDays' }))).toBe(2);
  });
});

describe('isMet', () => {
  it('treats a zero target as "must not happen"', () => {
    expect(isMet(0, rule({ value: 0 }))).toBe(true);
    expect(isMet(1, rule({ value: 0 }))).toBe(false);
  });

  it('honours the >= operator', () => {
    expect(isMet(3, rule({ operator: '>=', value: 3 }))).toBe(true);
    expect(isMet(2, rule({ operator: '>=', value: 3 }))).toBe(false);
  });

  it('honours the <= operator', () => {
    expect(isMet(3, rule({ operator: '<=', value: 3 }))).toBe(true);
    expect(isMet(4, rule({ operator: '<=', value: 3 }))).toBe(false);
  });
});

describe('isRulePeriodMet', () => {
  it('counts only the activities that match the rule subject', () => {
    const acts = [
      activity({ actions: [{ id: 1, tags: [] }] as never }),
      activity({ actions: [{ id: 2, tags: [] }] as never }),
    ];
    expect(isRulePeriodMet(rule({ value: 2 }), acts)).toBe(false);
    expect(isRulePeriodMet(rule({ value: 1 }), acts)).toBe(true);
  });

  it('is met by an empty period when the rule forbids the subject', () => {
    expect(isRulePeriodMet(rule({ value: 0 }), [])).toBe(true);
  });
});

describe('getCompletedPeriods', () => {
  it('lists whole weeks before the current one', () => {
    const periods = getCompletedPeriods(rule({ period: 'week', startDate: '2026-01-05' }), '2026-01-20');
    expect(periods).toEqual([
      ['2026-01-05', '2026-01-11'],
      ['2026-01-12', '2026-01-18'],
    ]);
  });

  it('excludes the week in progress', () => {
    const periods = getCompletedPeriods(rule({ period: 'week', startDate: '2026-01-12' }), '2026-01-14');
    expect(periods).toEqual([]);
  });

  it('lists whole months before the current one', () => {
    const periods = getCompletedPeriods(rule({ period: 'month', startDate: '2025-11-10' }), '2026-01-05');
    expect(periods).toEqual([
      ['2025-11-01', '2025-11-30'],
      ['2025-12-01', '2025-12-31'],
    ]);
  });

  it('lists days up to yesterday while the rule is open', () => {
    const periods = getCompletedPeriods(rule({ startDate: '2026-01-12' }), '2026-01-14');
    expect(periods).toEqual([
      ['2026-01-12', '2026-01-12'],
      ['2026-01-13', '2026-01-13'],
    ]);
  });

  it('stops at the end date of a closed daily rule', () => {
    const periods = getCompletedPeriods(
      rule({ startDate: '2026-01-12', endDate: '2026-01-13' }),
      '2026-01-20',
    );
    expect(periods).toEqual([
      ['2026-01-12', '2026-01-12'],
      ['2026-01-13', '2026-01-13'],
    ]);
  });

  it('counts the week holding the end date — a closed rule has no week in progress', () => {
    const periods = getCompletedPeriods(
      rule({ period: 'week', startDate: '2026-01-05', endDate: '2026-01-14' }),
      '2026-01-20',
    );
    expect(periods).toEqual([
      ['2026-01-05', '2026-01-11'],
      ['2026-01-12', '2026-01-18'],
    ]);
  });

  it('counts the month holding the end date', () => {
    const periods = getCompletedPeriods(
      rule({ period: 'month', startDate: '2025-11-10', endDate: '2025-12-20' }),
      '2026-03-05',
    );
    expect(periods).toEqual([
      ['2025-11-01', '2025-11-30'],
      ['2025-12-01', '2025-12-31'],
    ]);
  });
});
