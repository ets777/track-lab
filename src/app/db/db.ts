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

      actionDictionaries: '++id, [actionId+dictionaryId]',
      actionMetrics: '++id, [actionId+metricId]',
      activityTerms: '++id, [activityId+termId]',
      activityMetrics: '++id, [activityId+metricId]',
      terms: '++id, name',
      dictionaries: '++id, name',
      metrics: '++id, name',
      streaks: '++id, lastDate, actionId, tagId, termId',
    }).upgrade(async (tx) => {
      // 1. create 3 metrics - mood, energy, satiety
      const moodMetricId = await tx.table('metrics')
        .add({
          name: 'TK_MOOD',
          step: 1,
          minValue: 1,
          maxValue: 10,
          isHidden: false,
          isBase: true,
        });
      const energyMetricId = await tx.table('metrics')
        .add({
          name: 'TK_ENERGY',
          step: 1,
          minValue: 1,
          maxValue: 10,
          isHidden: false,
          isBase: true,
        });
      const satietyMetricId = await tx.table('metrics')
        .add({
          name: 'TK_SATIETY',
          step: 1,
          minValue: 1,
          maxValue: 10,
          isHidden: false,
          isBase: true,
        });

      // 2. create 1 dictionary - emotions
      const emotionsDictionaryId = await tx.table('dictionaries').add({ name: 'TK_EMOTIONS', isBase: true });

      // 3. get all activities
      const allActivities = await tx.table('activities').toArray();

      // 4, 5, 6, 7. process each activity
      for (const activity of allActivities) {
        // 4. save mood, energy, satiety to activity-metric
        if (activity.mood && activity.mood > 0) {
          await tx.table('activityMetrics').add({
            activityId: activity.id,
            metricId: moodMetricId,
            value: activity.mood,
          });
        }

        if (activity.energy && activity.energy > 0) {
          await tx.table('activityMetrics').add({
            activityId: activity.id,
            metricId: energyMetricId,
            value: activity.energy,
          });
        }

        if (activity.satiety && activity.satiety > 0) {
          await tx.table('activityMetrics').add({
            activityId: activity.id,
            metricId: satietyMetricId,
            value: activity.satiety,
          });
        }

        // 5. save emotions as dictionary items (check for existing ones)
        if (activity.emotions && activity.emotions !== '') {
          const emotionNames = getEntitiesFromString(activity.emotions);
          for (const emotionDto of emotionNames) {
            let term = await tx.table('terms')
              .where('name')
              .equalsIgnoreCase(emotionDto.name)
              .first();

            if (!term) {
              const itemId = await tx.table('terms').add({
                name: emotionDto.name,
                dictionaryId: emotionsDictionaryId,
              });
              term = {
                id: itemId,
                name: emotionDto.name,
                dictionaryId: emotionsDictionaryId,
              };
            }

            // create relation
            await tx.table('activityTerms').add({
              activityId: activity.id,
              termId: term.id!,
            });
          }
        }

        // 6. delete mood, energy, satiety, emotions values
        delete activity.mood;
        delete activity.energy;
        delete activity.satiety;
        delete activity.emotions;

        // 7. save activity
        await tx.table('activities').put(activity);
      }
    });

    this.version(5).stores({
      tagMetrics: '++id, tagId, metricId, [tagId+metricId]',
    });

    this.version(6).stores({}).upgrade(async (tx) => {
      await tx.table('dictionaries')
        .where('name').equals('TK_EMOTIONS')
        .modify({ isBase: true });
    });

    this.version(7).stores({
      terms: '++id, name, dictionaryId',
    });

    this.version(8).stores({
      termMetrics: '++id, termId, metricId, [termId+metricId]',
    });

    this.version(9).stores({
      activityTerms: '++id, activityId, termId, [activityId+termId]',
    });

    this.version(10).stores({
      actionDictionaries: null,
      activityTerms: null,
      terms: null,
      dictionaries: null,
      termMetrics: null,
      actionLists: '++id, [actionId+listId]',
      activityItems: '++id, activityId, itemId, [activityId+itemId]',
      items: '++id, name, listId',
      lists: '++id, name',
      itemMetrics: '++id, itemId, metricId, [itemId+metricId]',
      streaks: '++id, lastDate, actionId, tagId, itemId',
    }).upgrade(async (tx) => {
      const dicts = await tx.table('dictionaries').toArray();
      for (const d of dicts) {
        await tx.table('lists').add(d);
      }

      const terms = await tx.table('terms').toArray();
      for (const t of terms) {
        await tx.table('items').add({ id: t.id, name: t.name, listId: t.dictionaryId, isHidden: t.isHidden ?? false });
      }

      const activityTerms = await tx.table('activityTerms').toArray();
      for (const at of activityTerms) {
        await tx.table('activityItems').add({ id: at.id, activityId: at.activityId, itemId: at.termId });
      }

      const termMetrics = await tx.table('termMetrics').toArray();
      for (const tm of termMetrics) {
        await tx.table('itemMetrics').add({ id: tm.id, itemId: tm.termId, metricId: tm.metricId });
      }

      const actionDicts = await tx.table('actionDictionaries').toArray();
      for (const ad of actionDicts) {
        await tx.table('actionLists').add({ id: ad.id, actionId: ad.actionId, listId: ad.dictionaryId });
      }

      const streaks = await tx.table('streaks').toArray();
      for (const s of streaks) {
        if (s.termId !== undefined) {
          const updated = { ...s, itemId: s.termId };
          delete updated.termId;
          await tx.table('streaks').put(updated);
        }
      }
    });
  }
}

export const db = new MyAppDatabase('myAppDB');
