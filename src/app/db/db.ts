import Dexie, { Table } from 'dexie';
import { IActivityCreateDto, IActivityDb } from './models/activity';
import { IActionCreateDto, IActionDb } from './models/action';
import { IActivityActionCreateDto, IActivityActionDb } from './models/activity-action';
import { getEntitiesFromString } from '../functions/string';
import { IAchievementCreateDto, IAchievementDb } from './models/achievement';
import { IActivityTagCreateDto, IActivityTagDb } from './models/activity-tag';
import { IActionTagCreateDto, IActionTagDb } from './models/action-tag';
import { ITagCreateDto, ITagDb } from './models/tag';
import { IActionListCreateDto, IActionListDb } from './models/action-list';
import { IActionMetricCreateDto, IActionMetricDb } from './models/action-metric';
import { IActivityItemCreateDto, IActivityItemDb } from './models/activity-item';
import { IActivityMetricCreateDto, IActivityMetricDb } from './models/activity-metric';
import { IItemCreateDto, IItemDb } from './models/item';
import { IListCreateDto, IListDb } from './models/list';
import { IMetricCreateDto, IMetricDb } from './models/metric';
import { IStreakCreateDto, IStreakDb } from './models/streak';
import { ITagMetricCreateDto, ITagMetricDb } from './models/tag-metric';
import { IItemMetricCreateDto, IItemMetricDb } from './models/item-metric';
import { IRuleCreateDto, IRuleDb } from './models/rule';

export class MyAppDatabase extends Dexie {
  activities!: Table<IActivityDb, number, IActivityCreateDto>;
  actions!: Table<IActionDb, number, IActionCreateDto>;
  activityActions!: Table<IActivityActionDb, number, IActivityActionCreateDto>;
  achievements!: Table<IAchievementDb, number, IAchievementCreateDto>;
  tags!: Table<ITagDb, number, ITagCreateDto>;
  actionTags!: Table<IActionTagDb, number, IActionTagCreateDto>;
  activityTags!: Table<IActivityTagDb, number, IActivityTagCreateDto>;

  actionLists!: Table<IActionListDb, number, IActionListCreateDto>;
  actionMetrics!: Table<IActionMetricDb, number, IActionMetricCreateDto>;
  activityItems!: Table<IActivityItemDb, number, IActivityItemCreateDto>;
  activityMetrics!: Table<IActivityMetricDb, number, IActivityMetricCreateDto>;
  items!: Table<IItemDb, number, IItemCreateDto>;
  lists!: Table<IListDb, number, IListCreateDto>;
  metrics!: Table<IMetricDb, number, IMetricCreateDto>;
  streaks!: Table<IStreakDb, number, IStreakCreateDto>;
  tagMetrics!: Table<ITagMetricDb, number, ITagMetricCreateDto>;
  itemMetrics!: Table<IItemMetricDb, number, IItemMetricCreateDto>;
  rules!: Table<IRuleDb, number, IRuleCreateDto>;

  constructor(databaseName: string) {
    super(databaseName);

    // Dexie.delete('myAppDB');

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

    this.version(3).stores({
      activities: '++id, date, [date+startTime], mood, energy, satiety',
      actions: '++id, name',
      activityActions: '++id, activityId, actionId, [activityId+actionId]',
      achievements: '++id, code, unlocked',
      tags: '++id, name',
      actionTags: '++id, actionId, tagId, [actionId+tagId]',
      activityTags: '++id, activityId, tagId, [activityId+tagId]',
    });

    this.version(4).stores({
      activities: '++id, date, [date+startTime]',
      actions: '++id, name, isHidden',
      activityActions: '++id, activityId, actionId, [activityId+actionId]',
      achievements: '++id, code, unlocked',
      tags: '++id, name, isHidden',
      actionTags: '++id, actionId, tagId, [actionId+tagId]',
      activityTags: '++id, activityId, tagId, [activityId+tagId]',
      actionLists: '++id, [actionId+listId]',
      actionMetrics: '++id, [actionId+metricId]',
      activityItems: '++id, activityId, itemId, [activityId+itemId]',
      activityMetrics: '++id, [activityId+metricId]',
      items: '++id, name, listId',
      lists: '++id, name',
      metrics: '++id, name',
      streaks: '++id, lastDate, actionId, tagId, itemId',
      tagMetrics: '++id, tagId, metricId, [tagId+metricId]',
      itemMetrics: '++id, itemId, metricId, [itemId+metricId]',
    }).upgrade(async (tx) => {
      // 1. create 3 metrics - mood, energy, satiety
      const moodMetricId = await tx.table('metrics').add({ name: 'TK_MOOD', step: 1, minValue: 1, maxValue: 10, isHidden: false, isBase: true });
      const energyMetricId = await tx.table('metrics').add({ name: 'TK_ENERGY', step: 1, minValue: 1, maxValue: 10, isHidden: false, isBase: true });
      const satietyMetricId = await tx.table('metrics').add({ name: 'TK_SATIETY', step: 1, minValue: 1, maxValue: 10, isHidden: false, isBase: true });

      // 2. create emotions list
      const emotionsListId = await tx.table('lists').add({ name: 'TK_EMOTIONS', isBase: true });

      // 3. process each activity
      const allActivities = await tx.table('activities').toArray();
      for (const activity of allActivities) {
        if (activity.mood && activity.mood > 0) {
          await tx.table('activityMetrics').add({ activityId: activity.id, metricId: moodMetricId, value: activity.mood });
        }
        if (activity.energy && activity.energy > 0) {
          await tx.table('activityMetrics').add({ activityId: activity.id, metricId: energyMetricId, value: activity.energy });
        }
        if (activity.satiety && activity.satiety > 0) {
          await tx.table('activityMetrics').add({ activityId: activity.id, metricId: satietyMetricId, value: activity.satiety });
        }

        if (activity.emotions && activity.emotions !== '') {
          const emotionNames = getEntitiesFromString(activity.emotions);
          for (const emotionDto of emotionNames) {
            let item = await tx.table('items').where('name').equalsIgnoreCase(emotionDto.name).first();
            if (!item) {
              const itemId = await tx.table('items').add({ name: emotionDto.name, listId: emotionsListId, isHidden: false });
              item = { id: itemId, name: emotionDto.name, listId: emotionsListId };
            }
            await tx.table('activityItems').add({ activityId: activity.id, itemId: item.id });
          }
        }

        delete activity.mood;
        delete activity.energy;
        delete activity.satiety;
        delete activity.emotions;
        await tx.table('activities').put(activity);
      }
    });

    this.version(5).stores({
      actionMetrics: '++id, actionId, metricId, [actionId+metricId]',
      activityMetrics: '++id, activityId, metricId, [activityId+metricId]',
    });

    this.version(6).stores({
      rules: '++id, startDate',
    });
  }
}

export const db = new MyAppDatabase('myAppDB');
