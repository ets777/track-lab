import { Injectable } from '@angular/core';
import { db, IActivityDTO } from '../db';
import { IActivity } from '../db';
import { addDays, format } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class ActivityService {
    async add(activity: IActivityDTO) {
        const lastActivity = await this.getLast();

        if (lastActivity && !lastActivity.endTime && lastActivity.id) {
            await this.update(lastActivity.id, { endTime: activity.startTime });
        }

        return db.activities.add(activity);
    }

    async get(id: number) {
        return db.activities.get(id);
    }

    async getAll() {
        return db.activities.toArray();
    }

    async getLast() {
        const lastActivity = await db.activities
            .orderBy('[date+startTime]')
            .last();

        return lastActivity;
    }

    async getByDate(startDate: string, endDate?: string) {
        if (!endDate) {
            endDate = format(addDays(new Date(startDate), 1), 'yyyy-MM-dd');
        } else {
            endDate = format(addDays(new Date(endDate), 1), 'yyyy-MM-dd');
        }
        const activity = await db.activities
            .where('date')
            .between(startDate, endDate)
            .toArray();

        return activity;
    }

    async update(id: number, changes: Partial<IActivity>) {
        return db.activities.update(id, changes);
    }

    async delete(id: number) {
        return db.activities.delete(id);
    }
}
