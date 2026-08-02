import { IActivity } from '../db/models/activity';
import { IRule } from '../db/models/rule';
import { computeDayStatusMap, computeRuleStatusesForDay } from './rule-color';

function activity(partial: Partial<IActivity> = {}): IActivity {
  return {
    id: 1,
    date: '2026-07-30',
    startTime: '10:00',
    endTime: '11:00',
    actions: [{ id: 1, tags: [] }],
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
    startDate: '2026-07-01',
    endDate: null,
    startTime: null,
    endTime: null,
    ...partial,
  };
}

describe('computeRuleStatusesForDay', () => {
  it('drops a daily rule the day after it ended', () => {
    const statuses = computeRuleStatusesForDay('2026-08-01', [], [rule({ endDate: '2026-07-31' })]);
    expect(statuses).toEqual([]);
  });

  it('still shows a daily rule on its end date', () => {
    const statuses = computeRuleStatusesForDay('2026-07-31', [], [rule({ endDate: '2026-07-31' })]);
    expect(statuses.length).toBe(1);
  });

  it('keeps a weekly rule for the week its end date falls in', () => {
    // 2026-07-31 is a Friday: the week runs Mon 27th to Sun 2nd of August.
    const statuses = computeRuleStatusesForDay(
      '2026-08-02',
      [],
      [rule({ period: 'week', endDate: '2026-07-31' })],
    );
    expect(statuses.length).toBe(1);
  });

  it('drops a weekly rule once the whole week is past its end date', () => {
    const statuses = computeRuleStatusesForDay(
      '2026-08-05',
      [],
      [rule({ period: 'week', endDate: '2026-07-31' })],
    );
    expect(statuses).toEqual([]);
  });

  it('ignores activities logged after the rule ended', () => {
    const statuses = computeRuleStatusesForDay(
      '2026-07-31',
      [activity({ date: '2026-07-31' })],
      [rule({ endDate: '2026-07-30' })],
    );
    expect(statuses).toEqual([]);
  });
});

describe('computeDayStatusMap', () => {
  it('leaves days after the rule ended uncoloured', () => {
    const map = computeDayStatusMap(
      ['2026-07-31', '2026-08-01'],
      [],
      [rule({ endDate: '2026-07-31' })],
    );
    expect(map.get('2026-07-31')).toBe('red');
    expect(map.get('2026-08-01')).toBeNull();
  });
});
