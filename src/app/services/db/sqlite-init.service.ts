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
import { ActionLibraryService } from '../action-library.service';
import { ActionMetricService } from '../action-metric.service';
import { ActivityLibraryItemService } from '../activity-library-item.service';
import { ActivityMetricService } from '../activity-metric.service';
import { LibraryItemService } from '../library-item.service';
import { LibraryService } from '../library.service';
import { MetricService } from '../metric.service';
import { databaseUpgrades } from './database.upgrade';

@Injectable()
export class SQLiteInitService {
    private versionUpgrades;
    private loadToVersion;

    constructor(
        private sqliteService: SQLiteService,
        private activityService: ActivityService,
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
        private achievementService: AchievementService,
        private tagService: TagService,
        private actionTagService: ActionTagService,
        private activityTagService: ActivityTagService,
        private actionLibraryService: ActionLibraryService,
        private actionMetricService: ActionMetricService,
        private activityLibraryItemService: ActivityLibraryItemService,
        private activityMetricService: ActivityMetricService,
        private libraryItemService: LibraryItemService,
        private libraryService: LibraryService,
        private metricService: MetricService,
        private databaseRouter: DatabaseRouter,
    ) {
        this.versionUpgrades = databaseUpgrades;
        this.loadToVersion = this.versionUpgrades[this.versionUpgrades.length - 1].toVersion;
    }

    async initializeDatabase() {
        await this.sqliteService.addUpgradeStatement({
            upgrade: this.versionUpgrades,
        });
        
        await this.sqliteService.openDatabase(this.loadToVersion);
        
        const migratedToSqlite = (await Preferences.get({ key: 'migratedToSqlite' }))?.value === 'true';

        if (!migratedToSqlite) {
            this.databaseRouter.setAdapterToDexie();
            await this.migrateFromDexie();
        }

        this.databaseRouter.setAdapterToSqlite();
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
        const activities = await this.activityService.getAll();
        const actions = await this.actionService.getAll();
        const activityActions = await this.activityActionService.getAll();
        const achievements = await this.achievementService.getAll();
        const tags = await this.tagService.getAll();
        const actionTags = await this.actionTagService.getAll();
        const activityTags = await this.activityTagService.getAll();

        const actionLibraries = await this.actionLibraryService.getAll();
        const actionMetrics = await this.actionMetricService.getAll();
        const activityLibraryItems = await this.activityLibraryItemService.getAll();
        const activityMetrics = await this.activityMetricService.getAll();
        const libraryItems = await this.libraryItemService.getAll();
        const libraries = await this.libraryService.getAll();
        const metrics = await this.metricService.getAll();

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
                    ['startTime', 'date', 'endTime', 'id']
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

            if (actionLibraries.length) {
                await this.sqliteService.run('DELETE FROM actionLibraries');
                await this.insertArrayChunked(
                    'actionLibraries',
                    actionLibraries,
                    ['id', 'actionId', 'libraryId'],
                );
            }

            if (actionMetrics.length) {
                await this.sqliteService.run('DELETE FROM actionMetrics');
                await this.insertArrayChunked(
                    'actionMetrics',
                    actionMetrics,
                    ['id', 'actionId', 'metricId'],
                );
            }

            if (activityLibraryItems.length) {
                await this.sqliteService.run('DELETE FROM activityLibraryItems');
                await this.insertArrayChunked(
                    'activityLibraryItems',
                    activityLibraryItems,
                    ['id', 'activityId', 'libraryItemId'],
                );
            }

            if (activityMetrics.length) {
                await this.sqliteService.run('DELETE FROM activityMetrics');
                await this.insertArrayChunked(
                    'activityMetrics',
                    activityMetrics,
                    ['id', 'activityId', 'metricId', 'value'],
                );
            }

            if (libraryItems.length) {
                await this.sqliteService.run('DELETE FROM libraryItems');
                await this.insertArrayChunked(
                    'libraryItems',
                    libraryItems,
                    ['id', 'name', 'libraryId'],
                );
            }

            if (libraries.length) {
                await this.sqliteService.run('DELETE FROM libraries');
                await this.insertArrayChunked(
                    'libraries',
                    libraries,
                    ['id', 'name'],
                );
            }

            if (metrics.length) {
                await this.sqliteService.run('DELETE FROM metrics');
                await this.insertArrayChunked(
                    'metrics',
                    metrics,
                    ['id', 'name', 'isInt', 'unit', 'minValue', 'maxValue'],
                );
            }

            await this.sqliteService.commitTransaction();
            await Preferences.set({ key: 'migratedToSqlite', value: 'true' });
        } catch (err) {
            await this.sqliteService.rollbackTransaction();
            throw err;
        }
    }
}