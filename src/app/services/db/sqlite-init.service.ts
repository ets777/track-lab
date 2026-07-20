import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SQLiteService } from './sqlite.service';
import { Preferences } from '@capacitor/preferences';
import { databaseUpgrades } from './database.upgrade';
import { seedDatabase } from './database-seed';

@Injectable()
export class SQLiteInitService {
  private sqliteService = inject(SQLiteService);

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
      }
    }
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
      DROP TABLE IF EXISTS listLinks;
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
      DROP TABLE IF EXISTS experimentMetrics;
      DROP TABLE IF EXISTS experimentRules;
      DROP TABLE IF EXISTS experimentIndicators;
      DROP TABLE IF EXISTS experiments;
      DROP TABLE IF EXISTS ruleCompletions;
      DROP TABLE IF EXISTS rules;
      DROP TABLE IF EXISTS appConfig;
      PRAGMA foreign_keys = ON;
    `);

    for (const upgrade of databaseUpgrades) {
      for (const statement of upgrade.statements) {
        await this.sqliteService.execute(statement);
      }
    }
  }
}
