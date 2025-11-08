import { Injectable } from '@angular/core';
import { SQLiteService } from './sqlite.service';
import { ActivityService } from '../activity.service';
import { ActionService } from '../action.service';
import { ActivityActionService } from '../activity-action.service';
import { AchievementService } from '../achievement.service';
import { TagService } from '../tag.service';
import { ActionTagService } from '../action-tag.service';
import { ActivityTagService } from '../activity-tag.service';
import { Preferences } from '@capacitor/preferences';
import { DatabaseRouter } from './database-router.service';

@Injectable()
export class SQLiteInitService {
    private versionUpgrades;

    constructor(
        private sqliteService: SQLiteService,
        private activityService: ActivityService,
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
        private achievementService: AchievementService,
        private tagService: TagService,
        private actionTagService: ActionTagService,
        private activityTagService: ActivityTagService,
        private databaseRouter: DatabaseRouter,
    ) {
        this.versionUpgrades = [
            {
                toVersion: 1,
                statements: [
                    `CREATE TABLE IF NOT EXISTS users(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        active INTEGER DEFAULT 1
                    );`,
                    `CREATE TABLE IF NOT EXISTS activities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date TEXT NOT NULL,
                        startTime TEXT NOT NULL,
                        endTime TEXT,
                        mood INTEGER,
                        energy INTEGER,
                        satiety INTEGER,
                        emotions TEXT,
                        comment TEXT
                    );`,
                    `CREATE INDEX IF NOT EXISTS idx_activities_date_startTime ON activities(date, startTime);`,
                    `CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);`,
                    `CREATE TABLE IF NOT EXISTS actions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE
                    );`,
                    `CREATE INDEX IF NOT EXISTS idx_actions_name ON actions(name);`,
                    `CREATE TABLE IF NOT EXISTS activityActions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        activityId INTEGER NOT NULL,
                        actionId INTEGER NOT NULL,
                        FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
                        FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
                        UNIQUE(activityId, actionId)
                    );`,
                    `CREATE INDEX IF NOT EXISTS idx_activityActions_activity_action ON activityActions(activityId, actionId);`,
                    `CREATE TABLE IF NOT EXISTS achievements (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        icon TEXT,
                        code TEXT NOT NULL UNIQUE,
                        title TEXT NOT NULL,
                        target INTEGER NOT NULL DEFAULT 0,
                        current INTEGER NOT NULL DEFAULT 0,
                        unlocked INTEGER NOT NULL DEFAULT 0,
                        description TEXT,
                        data TEXT
                    );`,
                    `CREATE TABLE IF NOT EXISTS tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE
                    );`,
                    `CREATE TABLE IF NOT EXISTS actionTags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        actionId INTEGER NOT NULL,
                        tagId INTEGER NOT NULL,
                        FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
                        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
                        UNIQUE(actionId, tagId)
                    );`,
                    `CREATE INDEX IF NOT EXISTS idx_actionTags_action_tag ON actionTags(actionId, tagId);`,
                    `CREATE TABLE IF NOT EXISTS activityTags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        activityId INTEGER NOT NULL,
                        tagId INTEGER NOT NULL,
                        FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
                        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
                        UNIQUE(activityId, tagId)
                    );`,
                    `CREATE INDEX IF NOT EXISTS idx_activityTags_activity_tag ON activityTags(activityId, tagId);`,
                ],
            },
        ];
    }

    async createSqliteSchema() {
        await this.sqliteService.addUpgradeStatement({
            upgrade: this.versionUpgrades,
        });
        
        await this.migrateFromDexie();
    }

    async exportFromDexie() {
        const activities = await this.activityService.getAll();
        const actions = await this.actionService.getAll();
        const activityActions = await this.activityActionService.getAll();
        const achievements = await this.achievementService.getAll();
        const tags = await this.tagService.getAll();
        const actionTags = await this.actionTagService.getAll();
        const activityTags = await this.activityTagService.getAll();

        return {
            activities,
            actions,
            activityActions,
            achievements,
            tags,
            actionTags,
            activityTags,
        };
    }

    async insertArrayChunked(
        table: string,
        rows: any[],
        cols: string[],
        chunkSize = 200,
    ) {
        if (!rows || rows.length === 0) {
            return;
        }

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            const valuesSql = chunk.map((row) => {
                const vals = cols.map((column) => {
                    const value = row[column];

                    if (value === null || value === undefined) {
                        return 'NULL';
                    }

                    if (typeof value === 'string') {
                        return `'${value.replace(/'/g, "''")}'`;
                    }

                    return value;
                });

                return `(${vals.join(',')})`;
            }).join(',');

            const colsString = cols.join(',');
            const sql = `INSERT INTO ${table} (${colsString}) VALUES ${valuesSql};`;

            await this.sqliteService.execute(sql);
        }
    }

    async migrateFromDexie() {
        const {
            activities,
            actions,
            activityActions,
            achievements,
            tags,
            actionTags,
            activityTags,
        } = await this.exportFromDexie();

        try {
            await this.sqliteService.beginTransaction();

            if (achievements.length) {
                await this.sqliteService.run('DELETE FROM achievements');
                await this.insertArrayChunked(
                    'achievements', 
                    achievements,
                    ['icon', 'code', 'title', 'description', 'target', 'current', 'unlocked', 'id'],
                );
            }

            if (actions.length) {
                await this.sqliteService.run('DELETE FROM actions');
                await this.insertArrayChunked(
                    'actions', 
                    actions,
                    ['name', 'id'],
                );
            }

            if (tags.length) {
                await this.sqliteService.run('DELETE FROM tags');
                await this.insertArrayChunked(
                    'tags', 
                    tags,
                    ['name', 'id'],
                );
            }

            if (activities.length) {
                await this.sqliteService.run('DELETE FROM activities');
                await this.insertArrayChunked(
                    'activities', 
                    activities,
                    ['startTime', 'date', 'endTime', 'mood', 'energy', 'satiety', 'id']
                );
            }

            if (activityActions.length) {
                await this.sqliteService.run('DELETE FROM activityActions');
                await this.insertArrayChunked(
                    'activityActions', 
                    activityActions,
                    ['activityId', 'actionId', 'id'],
                );
            }

            if (actionTags.length) {
                await this.sqliteService.run('DELETE FROM actionTags');
                await this.insertArrayChunked(
                    'actionTags', 
                    actionTags,
                    ['id', 'actionId', 'tagId'],
                );
            }

            if (activityTags.length) {
                await this.sqliteService.run('DELETE FROM activityTags');
                await this.insertArrayChunked(
                    'activityTags', 
                    activityTags,
                    ['id', 'activityId', 'tagId'],
                );
            }

            await this.sqliteService.commitTransaction();
            await Preferences.set({ key: 'migratedToSqlite', value: 'true' });

            this.databaseRouter.setAdapterToSqlite();
        } catch (err) {
            await this.sqliteService.rollbackTransaction();
            throw err;
        }
    }
}