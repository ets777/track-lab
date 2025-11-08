import Dexie, { Table } from 'dexie';
import { IActivityCreateDto, IActivityDb } from './models/activity';
import { IActionCreateDto, IActionDb } from './models/action';
import { IActivityActionCreateDto, IActivityActionDb } from './models/activity-action';
import { getEntitiesFromString } from '../functions/string';
import { IAchievementCreateDto, IAchievementDb } from './models/achievement';
import { IActivityTagCreateDto, IActivityTagDb } from './models/activity-tag';
import { IActionTagCreateDto, IActionTagDb } from './models/action-tag';
import { ITagCreateDto, ITagDb } from './models/tag';

export class MyAppDatabase extends Dexie {
    activities!: Table<IActivityDb, number, IActivityCreateDto>;
    actions!: Table<IActionDb, number, IActionCreateDto>;
    activityActions!: Table<IActivityActionDb, number, IActivityActionCreateDto>;
    achievements!: Table<IAchievementDb, number, IAchievementCreateDto>;
    tags!: Table<ITagDb, number, ITagCreateDto>;
    actionTags!: Table<IActionTagDb, number, IActionTagCreateDto>;
    activityTags!: Table<IActivityTagDb, number, IActivityTagCreateDto>;

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
    }
}

export const db = new MyAppDatabase('myAppDB');
