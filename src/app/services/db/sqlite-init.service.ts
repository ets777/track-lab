import { Injectable } from '@angular/core';
import { SQLiteService } from './sqlite.service';

@Injectable()
export class SQLiteInitService {
    private versionUpgrades;

    constructor(private sqliteService: SQLiteService) {
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
    }
}