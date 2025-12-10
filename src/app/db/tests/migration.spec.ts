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

  it('should correctly migrate metrics and emotions from v3 to v4', async () => {
    // Create a v3 database with activities containing mood, energy, satiety, and emotions
    class TestDatabaseV3 extends Dexie {
      activities!: Table<any, number>;
      actions!: Table<any, number>;
      activityActions!: Table<any, number>;
      achievements!: Table<any, number>;
      tags!: Table<any, number>;
      actionTags!: Table<any, number>;
      activityTags!: Table<any, number>;

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

    const testDatabaseV3 = new TestDatabaseV3();
    await testDatabaseV3.open();

    // Add test data with mood, energy, satiety, and emotions
    await testDatabaseV3.activities.bulkAdd([
      {
        date: '2025-11-10',
        startTime: '08:00',
        mood: 7,
        energy: 8,
        satiety: 6,
        emotions: 'happy, confident',
        comment: 'great morning'
      },
      {
        date: '2025-11-10',
        startTime: '14:00',
        mood: 5,
        energy: 4,
        satiety: 3,
        emotions: 'tired',
        comment: 'afternoon slump'
      },
      {
        date: '2025-11-10',
        startTime: '20:00',
        mood: 0,
        energy: 0,
        satiety: 0,
        emotions: '',
        comment: ''
      },
    ]);

    testDatabaseV3.close();

    // Open with v4 database
    const testDatabaseV4 = new MyAppDatabase('TestDatabaseV3');
    await testDatabaseV4.open();

    // Check metrics were created
    const metrics = await testDatabaseV4.metrics.toArray();
    expect(metrics.length).toBe(3);
    expect(metrics).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ name: 'TK_MOOD' }),
      jasmine.objectContaining({ name: 'TK_ENERGY' }),
      jasmine.objectContaining({ name: 'TK_SATIETY' }),
    ]));

    // Check dictionary was created for emotions
    const dictionaries = await testDatabaseV4.dictionaries.toArray();
    expect(dictionaries.length).toBe(1);
    expect(dictionaries[0].name).toBe('TK_EMOTIONS');

    // Check activity metrics were created
    const activityMetrics = await testDatabaseV4.activityMetrics.toArray();
    expect(activityMetrics.length).toBe(6); // 3 metrics for first activity + 3 for second

    // Check dictionary items were created for emotions
    const terms = await testDatabaseV4.terms.toArray();
    expect(terms.length).toBe(3); // happy, confident, tired
    expect(terms).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ name: 'happy', dictionaryId: dictionaries[0].id }),
      jasmine.objectContaining({ name: 'confident', dictionaryId: dictionaries[0].id }),
      jasmine.objectContaining({ name: 'tired', dictionaryId: dictionaries[0].id }),
    ]));

    // Check activity dictionary items were created
    const activityTerms = await testDatabaseV4.activityTerms.toArray();
    expect(activityTerms.length).toBe(3); // happy, confident, tired

    // Check activities no longer have mood, energy, satiety, emotions
    const activities = await testDatabaseV4.activities.toArray();
    expect(activities[0].hasOwnProperty('mood')).toBeFalse();
    expect(activities[0].hasOwnProperty('energy')).toBeFalse();
    expect(activities[0].hasOwnProperty('satiety')).toBeFalse();
    expect(activities[0].hasOwnProperty('emotions')).toBeFalse();

    expect(activities[1].hasOwnProperty('mood')).toBeFalse();
    expect(activities[1].hasOwnProperty('energy')).toBeFalse();
    expect(activities[1].hasOwnProperty('satiety')).toBeFalse();
    expect(activities[1].hasOwnProperty('emotions')).toBeFalse();

    expect(activities[2].hasOwnProperty('mood')).toBeFalse();
    expect(activities[2].hasOwnProperty('energy')).toBeFalse();
    expect(activities[2].hasOwnProperty('satiety')).toBeFalse();
    expect(activities[2].hasOwnProperty('emotions')).toBeFalse();

    testDatabaseV4.close();
  });
});