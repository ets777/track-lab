import { Injectable } from '@angular/core';
import { db } from '../db/db';
import { addDays, format } from 'date-fns';
import Dexie from 'dexie';
import { IActivity, IActivityCreateDto, IActivityDb } from '../db/models/activity';
import { ActivityForm } from '../components/activity-form/activity-form.component';
import { ActionService } from './action.service';
import { IAction } from '../db/models/action';
import { ActivityActionService } from './activity-action.service';

@Injectable({ providedIn: 'root' })
export class ActivityService {
    constructor(
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
    ) {}

    async add(activityFormValue: ActivityForm) {
        const activity = this.prepareActivityFormValue(activityFormValue);

        if (!activity) {
            return;
        }

        const lastActivity = await this.getLast(activity.date);

        if (lastActivity && !lastActivity.endTime && lastActivity.id) {
            await this.update(lastActivity.id, { endTime: activity.startTime });
        }

        const activityId = await db.activities.add(activity);

        await this.actionService.addFromString(activityFormValue.actions, activityId);

        return activityId;
    }

    async get(id: number) {
        const activity = await db.activities.get(id);

        if (!activity) {
            return;
        }

        return this.enrichOne(activity);
    }

    async getAll() {
        const activities = await db.activities.toArray();
        return this.enrichAll(activities);
    }

    async getLast(date?: string) {
        let lastActivity;

        if (date) {
            lastActivity = await db.activities
                .where('[date+startTime]')
                .belowOrEqual([date, Dexie.maxKey])
                .last();
        } else {
            lastActivity = await db.activities
                .orderBy('[date+startTime]')
                .last();
        }

        return lastActivity;
    }

    async getByDate(startDate: string, endDate?: string) {
        if (!endDate) {
            endDate = format(addDays(new Date(startDate), 1), 'yyyy-MM-dd');
        } else {
            endDate = format(addDays(new Date(endDate), 1), 'yyyy-MM-dd');
        }
        const activities = await db.activities
            .where('date')
            .between(startDate, endDate)
            .toArray();

        return this.enrichAll(activities);
    }

    async update(id: number, changes: Partial<ActivityForm>) {
        if (!changes.actions) {
            return;
        }

        await this.actionService.updateFromString(
            changes.actions,
            id,
        );

        return db.activities.update(id, changes);
    }

    async delete(id: number) {
        await this.activityActionService.deleteByActivityId(id);

        return db.activities.delete(id);
    }

    prepareActivityFormValue(activityFormValue: ActivityForm) {
        if (
            !activityFormValue.startTime
            || !activityFormValue.date
            || !activityFormValue.actions
        ) {
            // throw exception
            return;
        }

        const activity: IActivityCreateDto = {
            startTime: activityFormValue.startTime,
            date: activityFormValue.date,
        };

        if (activityFormValue.endTime) {
            activity.endTime = activityFormValue.endTime;
        }

        if (activityFormValue.mood) {
            activity.mood = activityFormValue.mood;
        }

        if (activityFormValue.energy) {
            activity.energy = activityFormValue.energy;
        }

        if (activityFormValue.satiety) {
            activity.satiety = activityFormValue.satiety;
        }

        if (activityFormValue.emotions) {
            activity.emotions = activityFormValue.emotions;
        }

        if (activityFormValue.comment) {
            activity.comment = activityFormValue.comment;
        }

        return activity;
    }

    async enrichOne(activityDb: IActivityDb) {
        const actions: IAction[] = await this.actionService.getByActivityId(activityDb.id);

        return {
            ...activityDb,
            actions,
        } as IActivity;
    }

    async enrichAll(activitiesDb: IActivityDb[]) {
        const result = [];

        for (const activityDb of activitiesDb) {
            result.push(await this.enrichOne(activityDb));
        }

        return result;
    }
}
