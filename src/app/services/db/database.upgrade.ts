export const databaseUpgrades = [
    {
        toVersion: 1,
        statements: [
            `CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                startTime TEXT NOT NULL,
                endTime TEXT,
                comment TEXT
            );`,
            `CREATE INDEX IF NOT EXISTS idxActivitiesDateStartTime ON activities(date, startTime);`,
            `CREATE INDEX IF NOT EXISTS idxActivitiesDate ON activities(date);`,
            `CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                isHidden INTEGER CHECK (isHidden IN (0, 1)) DEFAULT 0
            );`,
            `CREATE INDEX IF NOT EXISTS idxActionsName ON actions(name);`,
            `CREATE TABLE IF NOT EXISTS activityActions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activityId INTEGER NOT NULL,
                actionId INTEGER NOT NULL,
                FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
                FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
                UNIQUE(activityId, actionId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActivityActionsActivityAction ON activityActions(activityId, actionId);`,
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
                name TEXT NOT NULL UNIQUE,
                isHidden INTEGER CHECK (isHidden IN (0, 1)) DEFAULT 0
            );`,
            `CREATE TABLE IF NOT EXISTS actionTags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actionId INTEGER NOT NULL,
                tagId INTEGER NOT NULL,
                FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
                FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(actionId, tagId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActionTagsActionTag ON actionTags(actionId, tagId);`,
            `CREATE TABLE IF NOT EXISTS activityTags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activityId INTEGER NOT NULL,
                tagId INTEGER NOT NULL,
                FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
                FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(activityId, tagId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActivityTagsActivityTag ON activityTags(activityId, tagId);`,
            `CREATE TABLE IF NOT EXISTS libraries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );`,
            `CREATE TABLE IF NOT EXISTS libraryItems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                libraryId INTEGER NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY(libraryId) REFERENCES libraries(id) ON DELETE CASCADE,
                UNIQUE(libraryId, name)
            );`,
            `CREATE INDEX IF NOT EXISTS idxLibraryItemsLibraryId ON libraryItems(libraryId);`,
            `CREATE TABLE IF NOT EXISTS actionLibraries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actionId INTEGER NOT NULL,
                libraryId INTEGER NOT NULL,
                FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
                FOREIGN KEY(libraryId) REFERENCES libraries(id) ON DELETE CASCADE,
                UNIQUE(actionId, libraryId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActionLibrariesActionLibrary ON actionLibraries(actionId, libraryId);`,
            `CREATE TABLE IF NOT EXISTS activityLibraryItems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activityId INTEGER NOT NULL,
                libraryItemId INTEGER NOT NULL,
                isHidden INTEGER CHECK (isHidden IN (0, 1)) DEFAULT 0,
                FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
                FOREIGN KEY(libraryItemId) REFERENCES libraryItems(id) ON DELETE CASCADE,
                UNIQUE(activityId, libraryItemId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActivityLibraryItemsActivityItem ON activityLibraryItems(activityId, libraryItemId);`,
            `CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                isInt INTEGER CHECK (isInt IN (0, 1)) DEFAULT 0,
                unit TEXT,
                minValue REAL,
                maxValue REAL
            );`,
            `CREATE TABLE IF NOT EXISTS actionMetrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actionId INTEGER NOT NULL,
                metricId INTEGER NOT NULL,
                value REAL,
                FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
                FOREIGN KEY(metricId) REFERENCES metrics(id) ON DELETE CASCADE,
                UNIQUE(actionId, metricId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActionMetricsActionMetric ON actionMetrics(actionId, metricId);`,
            `CREATE TABLE IF NOT EXISTS activityMetrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activityId INTEGER NOT NULL,
                metricId INTEGER NOT NULL,
                value REAL,
                FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
                FOREIGN KEY(metricId) REFERENCES metrics(id) ON DELETE CASCADE,
                UNIQUE(activityId, metricId)
            );`,
            `CREATE INDEX IF NOT EXISTS idxActivityMetricsActivityMetric ON activityMetrics(activityId, metricId);`,
        ],
    },
];
