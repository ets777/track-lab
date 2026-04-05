import Dexie, { Table } from 'dexie';
import { MyAppDatabase } from '../db';
import { IActionDb } from '../models/action';
import { getEntitiesFromString } from 'src/app/functions/string';

export interface IActivityDbV1 {
  id: number;
  actions: string;
  date: string;
  startTime: string;
  endTime?: string;
  mood: number;
  energy: number;
  satiety: number;
  emotions: string;
  comment: string;
}

export interface IActivityDbV2 {
  id: number;
  date: string;
  startTime: string;
  endTime?: string;
  mood: number;
  energy: number;
  satiety: number;
  emotions: string;
  comment: string;
}

export type IActivityCreateDtoV1 = Omit<IActivityDbV1, 'id'>;
export type IActivityCreateDtoV2 = Omit<IActivityDbV2, 'id'>;

class TestDatabaseV1 extends Dexie {
  activities!: Table<IActivityDbV1, number, IActivityCreateDtoV1>;

  constructor() {
    super('TestDatabaseV1V2');

    this.version(1).stores({
      activities: '++id, date, [date+startTime]',
    });
  }
}

class TestDatabaseV2 extends Dexie {
  activities!: Table<IActivityDbV2, number, IActivityCreateDtoV2>;
  actions!: Table<any, number, any>;
  activityActions!: Table<any, number, any>;
  achievements!: Table<any, number, any>;

  constructor() {
    super('TestDatabaseV1V2');

    this.version(1).stores({
      activities: '++id, date, [date+startTime]',
    });

    this.version(2).stores({
      activities: '++id, date, [date+startTime], mood, energy, satiety',
      actions: '++id, name',
      activityActions: '++id, activityId, actionId, [activityId+actionId]',
      achievements: '++id, code, unlocked',
    }).upgrade(async (tx) => {
      const allActivities = await tx.table('activities').toArray();

      for (const activity of allActivities) {
        if (activity.actions) {
          const actionsDto = getEntitiesFromString(activity.actions);

          for (const actionDto of actionsDto) {
            let action = await tx.table('actions').where('name').equalsIgnoreCase(actionDto.name).first();

            if (!action) {
              const id = await tx.table('actions').add(actionDto);
              action = { id, name: actionDto.name };
            }

            // create relation
            await tx.table('activityActions').add({
              activityId: activity.id,
              actionId: action.id!,
            });
          }
        }

        if (activity.mood === 0) {
          delete activity.mood;
        }

        if (activity.energy === 0) {
          delete activity.energy;
        }

        if (activity.satiety === 0) {
          delete activity.satiety;
        }

        if (activity.comment === '') {
          delete activity.comment;
        }

        if (activity.emotions === '') {
          delete activity.emotions;
        }

        delete activity.actions;
        await tx.table('activities').put(activity);
      }
    });
  }
}

class TestDatabaseV3 extends Dexie {
  activities!: Table<any, number, any>;
  actions!: Table<any, number, any>;
  activityActions!: Table<any, number, any>;
  achievements!: Table<any, number, any>;
  tags!: Table<any, number, any>;
  actionTags!: Table<any, number, any>;
  activityTags!: Table<any, number, any>;

  constructor() {
    super('TestDatabaseV3');
    this.version(3).stores({
      activities: '++id, date, [date+startTime], mood, energy, satiety',
      actions: '++id, name',
      activityActions: '++id, activityId, actionId, [activityId+actionId]',
      achievements: '++id, code, unlocked',
      tags: '++id, name',
      actionTags: '++id, actionId, tagId, [actionId+tagId]',
      activityTags: '++id, activityId, tagId, [activityId+tagId]',
    });
  }
}

describe('Database Migration (v1 to v2)', () => {

  beforeEach(async () => {
    await Dexie.delete('TestDatabaseV1V2');
  });

  it('should correctly migrate friends data from v1 to v2', async () => {
    const testDatabaseV1 = new TestDatabaseV1();
    await testDatabaseV1.open();
    await testDatabaseV1.activities.bulkAdd([
      {
        date: '2025-09-04',
        startTime: '09:00',
        mood: 5,
        energy: 5,
        satiety: 5,
        emotions: 'happy',
        comment: 'test migration',
        actions: 'ate breakfast, read book'
      },
      {
        date: '2025-09-04',
        startTime: '11:00',
        mood: 3,
        energy: 4,
        satiety: 2,
        emotions: 'tired',
        comment: 'second activity',
        actions: 'watched movie'
      },
      {
        date: '2025-09-04',
        startTime: '11:00',
        mood: 0,
        energy: 0,
        satiety: 0,
        emotions: '',
        comment: '',
        actions: 'read book, relaxed'
      },
    ]);
    testDatabaseV1.close();

    const testDatabaseV2 = new TestDatabaseV2();
    await testDatabaseV2.open();

    const actions = await testDatabaseV2.actions.toArray();

    expect(actions).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining<Partial<IActionDb>>({
        name: 'ate breakfast',
      }),
      jasmine.objectContaining<Partial<IActionDb>>({
        name: 'read book',
      }),
      jasmine.objectContaining<Partial<IActionDb>>({
        name: 'watched movie',
      }),
      jasmine.objectContaining<Partial<IActionDb>>({
        name: 'relaxed',
      }),
    ]));

    expect(actions.length).toBe(4);

    const activityActions = await testDatabaseV2.activityActions.toArray();

    expect(activityActions.length).toBe(5);

    const activities = await testDatabaseV2.activities.toArray();

    expect(activities[0].hasOwnProperty('satiety')).toBeTrue();
    expect(activities[1].hasOwnProperty('satiety')).toBeTrue();

    expect(activities[2].hasOwnProperty('satiety')).toBeFalse();
    expect(activities[2].hasOwnProperty('mood')).toBeFalse();
    expect(activities[2].hasOwnProperty('energy')).toBeFalse();
    expect(activities[2].hasOwnProperty('comment')).toBeFalse();
    expect(activities[2].hasOwnProperty('emotions')).toBeFalse();

    testDatabaseV2.close();
  });
});

describe('Database Migration (v3 to v4)', () => {

  beforeEach(async () => {
    await Dexie.delete('TestDatabaseV3');
  });

  it('should create the three base metrics and the emotions list', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    const metrics = await v4.metrics.toArray();
    expect(metrics.length).toBe(3);
    expect(metrics).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ name: 'TK_MOOD', isBase: true }),
      jasmine.objectContaining({ name: 'TK_ENERGY', isBase: true }),
      jasmine.objectContaining({ name: 'TK_SATIETY', isBase: true }),
    ]));

    const lists = await v4.lists.toArray();
    expect(lists.length).toBe(1);
    expect(lists[0]).toEqual(jasmine.objectContaining({ name: 'TK_EMOTIONS', isBase: true }));

    v4.close();
  });

  it('should migrate metric values into activityMetrics with correct values and links', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    const [activityId] = await v3.activities.bulkAdd([
      { date: '2025-11-10', startTime: '08:00', mood: 7, energy: 8, satiety: 6, emotions: '', comment: '' },
    ], { allKeys: true });
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    const metrics = await v4.metrics.toArray();
    const moodMetric = metrics.find(m => m.name === 'TK_MOOD')!;
    const energyMetric = metrics.find(m => m.name === 'TK_ENERGY')!;
    const satietyMetric = metrics.find(m => m.name === 'TK_SATIETY')!;

    const activityMetrics = await v4.activityMetrics.toArray();
    expect(activityMetrics.length).toBe(3);
    expect(activityMetrics).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ activityId, metricId: moodMetric.id, value: 7 }),
      jasmine.objectContaining({ activityId, metricId: energyMetric.id, value: 8 }),
      jasmine.objectContaining({ activityId, metricId: satietyMetric.id, value: 6 }),
    ]));

    v4.close();
  });

  it('should not create activityMetrics for zero-value metrics', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    await v3.activities.bulkAdd([
      { date: '2025-11-10', startTime: '08:00', mood: 5, energy: 0, satiety: 0, emotions: '', comment: '' },
      { date: '2025-11-10', startTime: '14:00', mood: 0, energy: 0, satiety: 0, emotions: '', comment: '' },
    ]);
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    const activityMetrics = await v4.activityMetrics.toArray();
    expect(activityMetrics.length).toBe(1);
    expect(activityMetrics[0]).toEqual(jasmine.objectContaining({ value: 5 }));

    v4.close();
  });

  it('should migrate emotions into items and activityItems with correct links', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    const [activity1Id, activity2Id] = await v3.activities.bulkAdd([
      { date: '2025-11-10', startTime: '08:00', mood: 0, energy: 0, satiety: 0, emotions: 'happy, confident', comment: '' },
      { date: '2025-11-10', startTime: '14:00', mood: 0, energy: 0, satiety: 0, emotions: 'tired', comment: '' },
    ], { allKeys: true });
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    const lists = await v4.lists.toArray();
    const emotionsList = lists.find(l => l.name === 'TK_EMOTIONS')!;

    const items = await v4.items.toArray();
    expect(items.length).toBe(3);
    const happyItem = items.find(i => i.name === 'happy')!;
    const confidentItem = items.find(i => i.name === 'confident')!;
    const tiredItem = items.find(i => i.name === 'tired')!;
    expect(happyItem.listId).toBe(emotionsList.id);
    expect(confidentItem.listId).toBe(emotionsList.id);
    expect(tiredItem.listId).toBe(emotionsList.id);

    const activityItems = await v4.activityItems.toArray();
    expect(activityItems.length).toBe(3);
    expect(activityItems).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ activityId: activity1Id, itemId: happyItem.id }),
      jasmine.objectContaining({ activityId: activity1Id, itemId: confidentItem.id }),
      jasmine.objectContaining({ activityId: activity2Id, itemId: tiredItem.id }),
    ]));

    v4.close();
  });

  it('should deduplicate emotion items shared across activities', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    await v3.activities.bulkAdd([
      { date: '2025-11-10', startTime: '08:00', mood: 0, energy: 0, satiety: 0, emotions: 'happy', comment: '' },
      { date: '2025-11-10', startTime: '14:00', mood: 0, energy: 0, satiety: 0, emotions: 'happy, tired', comment: '' },
    ]);
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    const items = await v4.items.toArray();
    expect(items.length).toBe(2); // happy appears once, tired once

    const activityItems = await v4.activityItems.toArray();
    expect(activityItems.length).toBe(3); // activity1→happy, activity2→happy, activity2→tired

    v4.close();
  });

  it('should preserve activity fields after migration', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    await v3.activities.add({
      date: '2025-11-10',
      startTime: '09:00',
      endTime: '10:00',
      mood: 6,
      energy: 7,
      satiety: 5,
      emotions: 'calm',
      comment: 'morning walk',
    });
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    const activities = await v4.activities.toArray();
    expect(activities.length).toBe(1);
    expect(activities[0].date).toBe('2025-11-10');
    expect(activities[0].startTime).toBe('09:00');
    expect(activities[0].endTime).toBe('10:00');
    expect(activities[0].comment).toBe('morning walk');
    expect(activities[0].hasOwnProperty('mood')).toBeFalse();
    expect(activities[0].hasOwnProperty('energy')).toBeFalse();
    expect(activities[0].hasOwnProperty('satiety')).toBeFalse();
    expect(activities[0].hasOwnProperty('emotions')).toBeFalse();

    v4.close();
  });

  it('should handle an empty v3 database', async () => {
    const v3 = new TestDatabaseV3();
    await v3.open();
    v3.close();

    const v4 = new MyAppDatabase('TestDatabaseV3');
    await v4.open();

    expect((await v4.metrics.count())).toBe(3);
    expect((await v4.lists.count())).toBe(1);
    expect((await v4.activityMetrics.count())).toBe(0);
    expect((await v4.items.count())).toBe(0);
    expect((await v4.activityItems.count())).toBe(0);

    v4.close();
  });
});