import { Injectable } from '@angular/core';
import { db } from '../db/db';
import { addDays, format } from 'date-fns';
import Dexie from 'dexie';
import { IActivity, IActivityCreateDto, IActivityDb } from '../db/models/activity';
import { ActivityForm } from '../components/activity-form/activity-form.component';
import { ActionService } from './action.service';
import { IAction } from '../db/models/action';
import { ActivityActionService } from './activity-action.service';
import { HookService } from './hook.service';
import { TagService } from './tag.service';
import { ITag } from '../db/models/tag';

@Injectable({ providedIn: 'root' })
export class ActivityService {
    constructor(
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
        private hookService: HookService,
        private tagService: TagService,
    ) { }

    async add(activity: IActivityCreateDto | IActivityDb) {
        return db.activities.add(activity);
    }

    async bulkAdd(activities: IActivityCreateDto[] | IActivityDb[]) {
        const result = [];

        for (const activity of activities) {
            result.push(await this.add(activity));
        }

        return result;
    }

    async addFromForm(activityFormValue: ActivityForm) {
        const activity = this.prepareActivityFormValue(activityFormValue);

        if (!activity) {
            return;
        }

        const lastActivity = await this.getLast(activity.date);

        if (lastActivity && !lastActivity.endTime && lastActivity.id) {
            await this.update(lastActivity.id, { endTime: activity.startTime }, false);
        }

        const activityId = await db.activities.add(activity);

        await this.actionService.addFromStringWithRelation(
            activityFormValue.actions,
            activityId,
        );
        await this.tagService.addFromStringWithActivityRelation(
            activityFormValue.tags,
            activityId,
        );

        this.hookService.emit({ type: 'activity.added', payload: { activityId } });

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
        return activities;
    }

    async getAllByRange(columnName: ('mood' | 'energy' | 'satiety'), range: {
        0: any;
        1: any;
    }) {
        const activities = await db.activities
            .where(columnName)
            .inAnyRange([range])
            .toArray();
        return activities;
    }

    async getAllEnriched() {
        const activities = await this.getAll();
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

        if (!lastActivity) {
            return;
        }

        return this.enrichOne(lastActivity);
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
            .sortBy('startTime');

        return this.enrichAll(activities);
    }

    async getByNewYear() {
        const activities = await db.activities
            .filter(activity =>
                activity.date.slice(5) == '01-01'
            )
            .toArray();

        return this.enrichAll(activities);
    }

    async update(
        id: number,
        changes: Partial<ActivityForm>,
        sendEvent: boolean = true,
    ) {
        if (changes.actions) {
            await this.actionService.updateFromString(
                changes.actions,
                id,
            );
        }

        await this.tagService.updateFromStringWithActivityRelation(
            changes.tags ?? '',
            id,
        );

        const rowsAffected = await db.activities.update(id, changes);

        if (sendEvent) {
            this.hookService.emit({ type: 'activity.updated', payload: { activityId: id } });
        }

        return rowsAffected;
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
        const tags: ITag[] = await this.tagService.getByActivityId(activityDb.id);

        return {
            ...activityDb,
            actions,
            tags,
        } as IActivity;
    }

    async enrichAll(activitiesDb: IActivityDb[]) {
        const result = [];

        for (const activityDb of activitiesDb) {
            result.push(await this.enrichOne(activityDb));
        }

        return result;
    }

    async clear() {
        await db.activities.clear();
    }

    async count() {
        return db.activities.count();
    }
}
