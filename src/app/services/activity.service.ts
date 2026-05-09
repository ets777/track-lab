import { Injectable, inject } from '@angular/core';
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
import { IActivityMetric } from '../db/models/activity-metric';
import { ActivityMetricService } from './activity-metric.service';
import { IItem } from '../db/models/item';
import { ItemService } from './item.service';
import { ActivityItemService } from './activity-item.service';

@Injectable({ providedIn: 'root' })
export class ActivityService extends DatabaseService<'activities'> {
  private actionService = inject(ActionService);
  private activityActionService = inject(ActivityActionService);
  private hookService = inject(HookService);
  private tagService = inject(TagService);
  private activityTagService = inject(ActivityTagService);
  private activityMetricService = inject(ActivityMetricService);
  private itemService = inject(ItemService);
  private activityItemService = inject(ActivityItemService);

  tableName: 'activities' = 'activities' as const;

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
      await this.updateWithItems(
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

  async getAllEnrichedForRules(fromDate?: string, toDate?: string): Promise<IActivity[]> {
    const activitiesPromise = (fromDate && toDate)
      ? this.getAllByRange('date', { 0: fromDate, 1: toDate })
      : this.getAll();

    const [activitiesDb, activityActions, activityTags, activityItems] = await Promise.all([
      activitiesPromise,
      this.activityActionService.getAll(),
      this.activityTagService.getAll(),
      this.activityItemService.getAll(),
    ]);

    const activities = (fromDate && !toDate) ? activitiesDb.filter(a => a.date >= fromDate) : activitiesDb;
    const activityIds = new Set(activities.map(a => a.id));

    const actionsByActivity = new Map<number, { id: number }[]>();
    for (const aa of activityActions) {
      if (!activityIds.has(aa.activityId)) continue;
      if (!actionsByActivity.has(aa.activityId)) actionsByActivity.set(aa.activityId, []);
      actionsByActivity.get(aa.activityId)!.push({ id: aa.actionId });
    }

    const tagsByActivity = new Map<number, { id: number }[]>();
    for (const at of activityTags) {
      if (!activityIds.has(at.activityId)) continue;
      if (!tagsByActivity.has(at.activityId)) tagsByActivity.set(at.activityId, []);
      tagsByActivity.get(at.activityId)!.push({ id: at.tagId });
    }

    const itemsByActivity = new Map<number, { id: number }[]>();
    for (const ai of activityItems) {
      if (!activityIds.has(ai.activityId)) continue;
      if (!itemsByActivity.has(ai.activityId)) itemsByActivity.set(ai.activityId, []);
      itemsByActivity.get(ai.activityId)!.push({ id: ai.itemId });
    }

    return activities.map(a => ({
      ...a,
      actions: (actionsByActivity.get(a.id) ?? []) as IAction[],
      tags: (tagsByActivity.get(a.id) ?? []) as ITag[],
      items: (itemsByActivity.get(a.id) ?? []) as IItem[],
      metricRecords: [],
    })) as IActivity[];
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

  async updateWithItems(
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

    delete changes.actions;
    delete changes.tags;

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
    const [actions, tags, metricRecords, items] = await Promise.all([
      this.actionService.getByActivityId(activityDb.id) as Promise<IAction[]>,
      this.tagService.getByActivityId(activityDb.id) as Promise<ITag[]>,
      this.activityMetricService.getByActivityId(activityDb.id) as Promise<IActivityMetric[]>,
      this.itemService.getByActivityId(activityDb.id) as Promise<IItem[]>,
    ]);

    return {
      ...activityDb,
      actions,
      tags,
      metricRecords,
      items,
    } as IActivity;
  }

  async enrichAll(activitiesDb: IActivityDb[]) {
    return Promise.all(activitiesDb.map(a => this.enrichOne(a)));
  }
}
