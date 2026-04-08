import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
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
import { ToastService } from '../toast.service';
import { ActionListService } from '../action-list.service';
import { ActionMetricService } from '../action-metric.service';
import { ActivityItemService } from '../activity-item.service';
import { ActivityMetricService } from '../activity-metric.service';
import { ItemService } from '../item.service';
import { ListService } from '../list.service';
import { MetricService } from '../metric.service';
import { StreakService } from '../streak.service';
import { TagMetricService } from '../tag-metric.service';
import { ItemMetricService } from '../item-metric.service';
import { databaseUpgrades } from './database.upgrade';
import { seedDatabase } from './database-seed';

@Injectable()
export class SQLiteInitService {
  private sqliteService = inject(SQLiteService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private activityActionService = inject(ActivityActionService);
  private achievementService = inject(AchievementService);
  private tagService = inject(TagService);
  private actionTagService = inject(ActionTagService);
  private activityTagService = inject(ActivityTagService);
  private actionListService = inject(ActionListService);
  private actionMetricService = inject(ActionMetricService);
  private activityItemService = inject(ActivityItemService);
  private activityMetricService = inject(ActivityMetricService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private metricService = inject(MetricService);
  private streakService = inject(StreakService);
  private tagMetricService = inject(TagMetricService);
  private itemMetricService = inject(ItemMetricService);
  private databaseRouter = inject(DatabaseRouter);
  private toastService = inject(ToastService);

  private versionUpgrades;
  private loadToVersion;

  constructor() {
    this.versionUpgrades = databaseUpgrades;
    this.loadToVersion = this.versionUpgrades[this.versionUpgrades.length - 1].toVersion;
  }

  async initializeDatabase() {
    await this.sqliteService.addUpgradeStatement({
      upgrade: this.versionUpgrades,
    });

    await this.sqliteService.openDatabase(this.loadToVersion);

    if (!environment.production) {
      const shouldReset = (await Preferences.get({ key: 'reset-database-on-reload' }))?.value === 'true';
      if (shouldReset) {
        await this.resetDatabase();
        await seedDatabase(this.sqliteService);
        this.databaseRouter.setAdapterToSqlite();
        return;
      }
    }

    const migratedToSqlite = (await Preferences.get({ key: 'migratedToSqlite' }))?.value === 'true';

    if (!migratedToSqlite) {
      this.databaseRouter.setAdapterToDexie();
      try {
        await this.migrateFromDexie();
        this.toastService.enqueue({ title: 'Data migrated successfully', type: 'success' });
      } catch (err) {
        this.toastService.enqueue({ title: 'Migration failed', type: 'error', duration: 5000 });
        throw err;
      }
    }

    this.databaseRouter.setAdapterToSqlite();
  }

  async resetDatabase() {
    await this.sqliteService.execute(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS activityMetrics;
      DROP TABLE IF EXISTS activityItems;
      DROP TABLE IF EXISTS activityTags;
      DROP TABLE IF EXISTS activityActions;
      DROP TABLE IF EXISTS tagMetrics;
      DROP TABLE IF EXISTS itemMetrics;
      DROP TABLE IF EXISTS termMetrics;
      DROP TABLE IF EXISTS actionMetrics;
      DROP TABLE IF EXISTS actionLists;
      DROP TABLE IF EXISTS actionDictionaries;
      DROP TABLE IF EXISTS actionTags;
      DROP TABLE IF EXISTS streaks;
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS actions;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS items;
      DROP TABLE IF EXISTS terms;
      DROP TABLE IF EXISTS lists;
      DROP TABLE IF EXISTS dictionaries;
      DROP TABLE IF EXISTS activityTerms;
      DROP TABLE IF EXISTS metrics;
      DROP TABLE IF EXISTS achievements;
      PRAGMA foreign_keys = ON;
    `);

    for (const upgrade of databaseUpgrades) {
      for (const statement of upgrade.statements) {
        await this.sqliteService.execute(statement);
      }
    }
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

          if (typeof value === 'boolean') {
            return value ? 1 : 0;
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

    const actionLists = await this.actionListService.getAll();
    const actionMetrics = await this.actionMetricService.getAll();
    const activityItems = await this.activityItemService.getAll();
    const activityMetrics = await this.activityMetricService.getAll();
    const items = await this.itemService.getAll();
    const lists = await this.listService.getAll();
    const metrics = await this.metricService.getAll();
    const streaks = await this.streakService.getAll();
    const tagMetrics = await this.tagMetricService.getAll();
    const itemMetrics = await this.itemMetricService.getAll();

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
          ['name', 'isHidden', 'id'],
        );
      }

      if (tags.length) {
        await this.sqliteService.run('DELETE FROM tags');
        await this.insertArrayChunked(
          'tags',
          tags,
          ['name', 'isHidden', 'id'],
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

      if (metrics.length) {
        await this.sqliteService.run('DELETE FROM metrics');
        await this.insertArrayChunked(
          'metrics',
          metrics,
          ['id', 'name', 'isBase', 'isHidden', 'step', 'unit', 'minValue', 'maxValue', 'showPreviousValue'],
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

      if (activityMetrics.length) {
        await this.sqliteService.run('DELETE FROM activityMetrics');
        await this.insertArrayChunked(
          'activityMetrics',
          activityMetrics,
          ['id', 'activityId', 'metricId', 'value'],
        );
      }

      if (lists.length) {
        await this.sqliteService.run('DELETE FROM lists');
        await this.insertArrayChunked(
          'lists',
          lists,
          ['id', 'name', 'isBase', 'isHidden'],
        );
      }

      if (actionLists.length) {
        await this.sqliteService.run('DELETE FROM actionLists');
        await this.insertArrayChunked(
          'actionLists',
          actionLists,
          ['id', 'actionId', 'listId'],
        );
      }

      if (items.length) {
        await this.sqliteService.run('DELETE FROM items');
        await this.insertArrayChunked(
          'items',
          items,
          ['id', 'name', 'listId'],
        );
      }

      if (activityItems.length) {
        await this.sqliteService.run('DELETE FROM activityItems');
        await this.insertArrayChunked(
          'activityItems',
          activityItems,
          ['id', 'activityId', 'itemId'],
        );
      }

      if (streaks.length) {
        await this.sqliteService.run('DELETE FROM streaks');
        await this.insertArrayChunked(
          'streaks',
          streaks,
          ['id', 'tagId', 'actionId', 'itemId', 'startDate', 'lastDate'],
        );
      }

      if (tagMetrics.length) {
        await this.sqliteService.run('DELETE FROM tagMetrics');
        await this.insertArrayChunked(
          'tagMetrics',
          tagMetrics,
          ['id', 'tagId', 'metricId'],
        );
      }

      if (itemMetrics.length) {
        await this.sqliteService.run('DELETE FROM itemMetrics');
        await this.insertArrayChunked(
          'itemMetrics',
          itemMetrics,
          ['id', 'itemId', 'metricId'],
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
