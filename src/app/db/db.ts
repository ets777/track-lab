import Dexie, { Table } from 'dexie';
import { IActivityCreateDto, IActivityDb } from './models/activity';
import { IActionCreateDto, IActionDb } from './models/action';
import { IActivityActionCreateDto, IActivityActionDb } from './models/activity-action';
import { getEntitiesFromString } from '../functions/string';
import { IAchievementCreateDto, IAchievementDb } from './models/achievement';
import { IActivityTagCreateDto, IActivityTagDb } from './models/activity-tag';
import { IActionTagCreateDto, IActionTagDb } from './models/action-tag';
import { ITagCreateDto, ITagDb } from './models/tag';
import { IActionLibraryCreateDto, IActionLibraryDb } from './models/action-library';
import { IActionMetricCreateDto, IActionMetricDb } from './models/action-metric';
import { IActivityLibraryItemCreateDto, IActivityLibraryItemDb } from './models/activity-library-item';
import { IActivityMetricCreateDto, IActivityMetricDb } from './models/activity-metric';
import { ILibraryItemCreateDto, ILibraryItemDb } from './models/library-item';
import { IDictionaryCreateDto, IDictionaryDb } from './models/library';
import { IMetricCreateDto, IMetricDb } from './models/metric';
import { IStreakCreateDto, IStreakDb } from './models/streak';

export class MyAppDatabase extends Dexie {
  activities!: Table<IActivityDb, number, IActivityCreateDto>;
  actions!: Table<IActionDb, number, IActionCreateDto>;
  activityActions!: Table<IActivityActionDb, number, IActivityActionCreateDto>;
  achievements!: Table<IAchievementDb, number, IAchievementCreateDto>;
  tags!: Table<ITagDb, number, ITagCreateDto>;
  actionTags!: Table<IActionTagDb, number, IActionTagCreateDto>;
  activityTags!: Table<IActivityTagDb, number, IActivityTagCreateDto>;

  actionLibraries!: Table<IActionLibraryDb, number, IActionLibraryCreateDto>;
  actionMetrics!: Table<IActionMetricDb, number, IActionMetricCreateDto>;
  activityLibraryItems!: Table<IActivityLibraryItemDb, number, IActivityLibraryItemCreateDto>;
  activityMetrics!: Table<IActivityMetricDb, number, IActivityMetricCreateDto>;
  libraryItems!: Table<ILibraryItemDb, number, ILibraryItemCreateDto>;
  libraries!: Table<IDictionaryDb, number, IDictionaryCreateDto>;
  metrics!: Table<IMetricDb, number, IMetricCreateDto>;
  streaks!: Table<IStreakDb, number, IStreakCreateDto>;

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

      actionLibraries: '++id, [actionId+libraryId]',
      actionMetrics: '++id, [actionId+metricId]',
      activityLibraryItems: '++id, [activityId+libraryItemId]',
      activityMetrics: '++id, [activityId+metricId]',
      libraryItems: '++id, name',
      libraries: '++id, name',
      metrics: '++id, name',
      streaks: '++id, lastDate, actionId, tagId, libraryItemId',
    }).upgrade(async (tx) => {
      // 1. create 3 metrics - mood, energy, satiety
      const moodMetricId = await tx.table('metrics')
        .add({
          name: 'TK_MOOD',
          isInt: true,
          minValue: 1,
          maxValue: 10,
          isHidden: false,
          isBase: true,
        });
      const energyMetricId = await tx.table('metrics')
        .add({
          name: 'TK_ENERGY',
          isInt: true,
          minValue: 1,
          maxValue: 10,
          isHidden: false,
          isBase: true,
        });
      const satietyMetricId = await tx.table('metrics')
        .add({
          name: 'TK_SATIETY',
          isInt: true,
          minValue: 1,
          maxValue: 10,
          isHidden: false,
          isBase: true,
        });

      // 2. create 1 library - emotions
      const emotionsLibraryId = await tx.table('libraries').add({ name: 'TK_EMOTIONS' });

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

        // 5. save emotions as library items (check for existing ones)
        if (activity.emotions && activity.emotions !== '') {
          const emotionNames = getEntitiesFromString(activity.emotions);
          for (const emotionDto of emotionNames) {
            let libraryItem = await tx.table('libraryItems')
              .where('name')
              .equalsIgnoreCase(emotionDto.name)
              .first();

            if (!libraryItem) {
              const itemId = await tx.table('libraryItems').add({
                name: emotionDto.name,
                libraryId: emotionsLibraryId,
              });
              libraryItem = {
                id: itemId,
                name: emotionDto.name,
                libraryId: emotionsLibraryId,
              };
            }

            // create relation
            await tx.table('activityLibraryItems').add({
              activityId: activity.id,
              libraryItemId: libraryItem.id!,
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
  }
}

export const db = new MyAppDatabase('myAppDB');
