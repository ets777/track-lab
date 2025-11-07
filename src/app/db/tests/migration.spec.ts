import Dexie, { Table } from 'dexie';
import { MyAppDatabase } from '../db';
import { IActionDb } from '../models/action';

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

export type IActivityCreateDtoV1 = Omit<IActivityDbV1, 'id'>;

class TestDatabaseV1 extends Dexie {
    activities!: Table<IActivityDbV1, number, IActivityCreateDtoV1>;

    constructor() {
        super('TestDatabase');
       
        this.version(1).stores({
            activities: '++id, date, [date+startTime]',
        });
    }
}

describe('Database Migration (v1 to v2)', () => {

    beforeEach(async () => {
        await Dexie.delete('TestDatabase');
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

        const testDatabaseV2 = new MyAppDatabase('TestDatabase');
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