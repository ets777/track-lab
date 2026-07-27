import { IActivity } from '../db/models/activity';
import { getActivityDurationMinutes } from './activity';

describe('getActivityDurationMinutes', () => {
  const activity = (startTime: string, endTime?: string) => ({
    id: 1,
    date: '2026-07-25',
    startTime,
    endTime,
    actions: [],
    tags: [],
    items: [],
    metricRecords: [],
  }) as IActivity;

  it('measures an activity inside one day', () => {
    expect(getActivityDurationMinutes(activity('22:54', '23:19'))).toBe(25);
  });

  it('wraps an activity that ends after midnight', () => {
    expect(getActivityDurationMinutes(activity('23:45', '00:15'))).toBe(30);
  });

  it('counts a full day when it ends at the start time of the next day', () => {
    expect(getActivityDurationMinutes(activity('23:45', '23:44'))).toBe(1439);
  });

  it('treats an unfinished activity as zero', () => {
    expect(getActivityDurationMinutes(activity('23:45'))).toBe(0);
  });

  it('treats an activity ending on its start minute as zero, not a full day', () => {
    expect(getActivityDurationMinutes(activity('23:45', '23:45'))).toBe(0);
  });
});
