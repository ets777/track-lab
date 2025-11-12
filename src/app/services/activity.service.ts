import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { IActivity, IActivityCreateDto, IActivityDb } from '../db/models/activity';
import { ActivityForm } from '../components/activity-form/activity-form.component';
import { ActionService } from './action.service';
import { IAction } from '../db/models/action';
import { ActivityActionService } from './activity-action.service';
import { HookService } from './hook.service';
import { TagService } from './tag.service';
import { ITag } from '../db/models/tag';
import { ActivityTagService } from './activity-tag.service';
import { DatabaseService } from './db/database.service';
import { DatabaseRouter } from './db/database-router.service';
import { IActivityMetric } from '../db/models/activity-metric';
import { ActivityMetricService } from './activity-metric.service';
import { ILibraryItem } from '../db/models/library-item';
import { LibraryItemService } from './library-item.service';

@Injectable({ providedIn: 'root' })
export class ActivityService extends DatabaseService<'activities'> {
    tableName: 'activities' = 'activities' as const;

    constructor(
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
        private hookService: HookService,
        private tagService: TagService,
        private activityTagService: ActivityTagService,
        private activityMetricService: ActivityMetricService,
        private libraryItemService: LibraryItemService,
        adapter: DatabaseRouter,
    ) {
        super(adapter);
    }

    async getEnriched(id: number) {
        const activity = await this.getById(id);

        if (!activity) {
            return;
        }

        return this.enrichOne(activity);
    }

    async addFromForm(activityFormValue: ActivityForm) {
        const activity = this.prepareActivityFormValue(activityFormValue);

        if (!activity) {
            return;
        }

        const lastActivity = await this.getLastEnriched(activity.date);

        if (lastActivity && !lastActivity.endTime && lastActivity.id) {
            await this.updateWithLibraryItems(
                lastActivity.id, 
                { endTime: activity.startTime }, 
                false,
            );
        }

        const activityId = await this.add(activity);

        await this.actionService.addFromStringWithRelation(
            activityFormValue.actions,
            activityId,
        );

        if (activityFormValue.tags) {
            await this.tagService.addFromStringWithActivityRelation(
                activityFormValue.tags,
                activityId,
            );
        }

        this.hookService.emit({ type: 'activity.added', payload: { activityId } });

        return activityId;
    }

    async getAllEnriched() {
        const activities = await this.getAll();
        return this.enrichAll(activities);
    }

    async getLastEnriched(date?: string) {
        let lastActivity;

        if (date) {
            lastActivity = await this.getLastBeforeDate(
                ['date', 'startTime'],
                date,
            );
        } else {
            lastActivity = await this.getLast(['date', 'startTime']);
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
        const activities = await this.getAllBetweenOrderedBy(
            'date',
            'startTime',
            startDate,
            endDate,
        );
            
        return this.enrichAll(activities);
    }

    async getByNewYear() {
        const activities = await this.getAll({
            OR: [
                { date: '2026-01-01' },
                { date: '2027-01-01' },
                { date: '2028-01-01' },
                { date: '2029-01-01' },
                { date: '2030-01-01' },
            ]
        });

        return this.enrichAll(activities);
    }

    async updateWithLibraryItems(
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

        if (typeof changes.tags !== 'undefined') {
            await this.tagService.updateFromStringWithActivityRelation(
                changes.tags,
                id,
            );
        }

        const rowsAffected = await this.update(id, changes);

        if (sendEvent) {
            this.hookService.emit({ type: 'activity.updated', payload: { activityId: id } });
        }

        return rowsAffected;
    }

    async deleteWithRelations(id: number) {
        await this.activityActionService.deleteByActivityId(id);
        await this.activityTagService.deleteByActivityId(id);

        return this.delete({ id });
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

        if (activityFormValue.comment) {
            activity.comment = activityFormValue.comment;
        }

        return activity;
    }

    async enrichOne(activityDb: IActivityDb) {
        const actions: IAction[] = await this.actionService.getByActivityId(activityDb.id);
        const tags: ITag[] = await this.tagService.getByActivityId(activityDb.id);
        const metricRecords: IActivityMetric[] = await this.activityMetricService.getByActivityId(activityDb.id);
        const libraryItems: ILibraryItem[] = await this.libraryItemService.getByActivityId(activityDb.id);
        
        return {
            ...activityDb,
            actions,
            tags,
            metricRecords,
            libraryItems,
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
