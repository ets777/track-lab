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
import { ActionDictionaryService } from '../action-dictionary.service';
import { ActionMetricService } from '../action-metric.service';
import { ActivityTermService } from '../activity-term.service';
import { ActivityMetricService } from '../activity-metric.service';
import { TermService } from '../term.service';
import { DictionaryService } from '../dictionary.service';
import { MetricService } from '../metric.service';
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
  private actionDictionaryService = inject(ActionDictionaryService);
  private actionMetricService = inject(ActionMetricService);
  private activityTermService = inject(ActivityTermService);
  private activityMetricService = inject(ActivityMetricService);
  private termService = inject(TermService);
  private dictionaryService = inject(DictionaryService);
  private metricService = inject(MetricService);
  private databaseRouter = inject(DatabaseRouter);

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
      await this.migrateFromDexie();
    }

    this.databaseRouter.setAdapterToSqlite();
  }

  async resetDatabase() {
    await this.sqliteService.execute(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS activityMetrics;
      DROP TABLE IF EXISTS activityTerms;
      DROP TABLE IF EXISTS activityTags;
      DROP TABLE IF EXISTS activityActions;
      DROP TABLE IF EXISTS tagMetrics;
      DROP TABLE IF EXISTS actionMetrics;
      DROP TABLE IF EXISTS actionDictionaries;
      DROP TABLE IF EXISTS actionTags;
      DROP TABLE IF EXISTS streaks;
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS actions;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS terms;
      DROP TABLE IF EXISTS dictionaries;
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

    const actionDictionaries = await this.actionDictionaryService.getAll();
    const actionMetrics = await this.actionMetricService.getAll();
    const activityTerms = await this.activityTermService.getAll();
    const activityMetrics = await this.activityMetricService.getAll();
    const terms = await this.termService.getAll();
    const dictionaries = await this.dictionaryService.getAll();
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

      if (metrics.length) {
        await this.sqliteService.run('DELETE FROM metrics');
        await this.insertArrayChunked(
          'metrics',
          metrics,
          ['id', 'name', 'step', 'unit', 'minValue', 'maxValue'],
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

      if (dictionaries.length) {
        await this.sqliteService.run('DELETE FROM dictionaries');
        await this.insertArrayChunked(
          'dictionaries',
          dictionaries,
          ['id', 'name'],
        );
      }

      if (actionDictionaries.length) {
        await this.sqliteService.run('DELETE FROM actionDictionaries');
        await this.insertArrayChunked(
          'actionDictionaries',
          actionDictionaries,
          ['id', 'actionId', 'dictionaryId'],
        );
      }

      if (terms.length) {
        await this.sqliteService.run('DELETE FROM terms');
        await this.insertArrayChunked(
          'terms',
          terms,
          ['id', 'name', 'dictionaryId'],
        );
      }

      if (activityTerms.length) {
        await this.sqliteService.run('DELETE FROM activityTerms');
        await this.insertArrayChunked(
          'activityTerms',
          activityTerms,
          ['id', 'activityId', 'termId'],
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