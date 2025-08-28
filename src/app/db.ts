import Dexie, { Table } from 'dexie';

export interface IActivity {
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

export interface IActivityCreateDTO {
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

export class MyAppDatabase extends Dexie {
    activities!: Table<IActivity, number, IActivityCreateDTO>;

    constructor() {
        super('myAppDB');

        // reset database
        // Dexie.delete('myAppDB');

        this.version(1).stores({
            activities: '++id, date, [date+startTime]',
        });
    }
}

export const db = new MyAppDatabase();
