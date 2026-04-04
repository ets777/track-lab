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
      `CREATE TABLE IF NOT EXISTS activityActions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activityId INTEGER NOT NULL,
        actionId INTEGER NOT NULL,
        FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
        UNIQUE(activityId, actionId)
      );`,
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
      `CREATE TABLE IF NOT EXISTS activityTags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activityId INTEGER NOT NULL,
        tagId INTEGER NOT NULL,
        FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(activityId, tagId)
      );`,
      `CREATE TABLE IF NOT EXISTS dictionaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        isBase INTEGER CHECK (isBase IN (0, 1)) DEFAULT 0,
        isHidden INTEGER CHECK (isHidden IN (0, 1)) DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dictionaryId INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY(dictionaryId) REFERENCES dictionaries(id) ON DELETE CASCADE,
        UNIQUE(dictionaryId, name)
      );`,
      `CREATE TABLE IF NOT EXISTS actionDictionaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actionId INTEGER NOT NULL,
        dictionaryId INTEGER NOT NULL,
        FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
        FOREIGN KEY(dictionaryId) REFERENCES dictionaries(id) ON DELETE CASCADE,
        UNIQUE(actionId, dictionaryId)
      );`,
      `CREATE TABLE IF NOT EXISTS activityTerms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activityId INTEGER NOT NULL,
        termId INTEGER NOT NULL,
        isHidden INTEGER CHECK (isHidden IN (0, 1)) DEFAULT 0,
        FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY(termId) REFERENCES terms(id) ON DELETE CASCADE,
        UNIQUE(activityId, termId)
      );`,
      `CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        isBase INTEGER CHECK (isBase IN (0, 1)) DEFAULT 0,
        isHidden INTEGER CHECK (isHidden IN (0, 1)) DEFAULT 0,
        step REAL DEFAULT 1,
        unit TEXT,
        minValue REAL,
        maxValue REAL,
        showPreviousValue INTEGER CHECK (showPreviousValue IN (0, 1)) DEFAULT 0
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
      `CREATE TABLE IF NOT EXISTS activityMetrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activityId INTEGER NOT NULL,
        metricId INTEGER NOT NULL,
        value REAL,
        FOREIGN KEY(activityId) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY(metricId) REFERENCES metrics(id) ON DELETE CASCADE,
        UNIQUE(activityId, metricId)
      );`,
      `CREATE TABLE IF NOT EXISTS tagMetrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tagId INTEGER NOT NULL,
        metricId INTEGER NOT NULL,
        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
        FOREIGN KEY(metricId) REFERENCES metrics(id) ON DELETE CASCADE,
        UNIQUE(tagId, metricId)
      );`,
      `CREATE TABLE IF NOT EXISTS streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tagId INTEGER,
        actionId INTEGER,
        termId INTEGER,
        startDate TEXT NOT NULL,
        lastDate TEXT,
        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE,
        FOREIGN KEY(actionId) REFERENCES actions(id) ON DELETE CASCADE,
        FOREIGN KEY(termId) REFERENCES terms(id) ON DELETE CASCADE,
        UNIQUE(tagId),
        UNIQUE(actionId),
        UNIQUE(termId)
      );`,
    ],
  },
  {
    toVersion: 2,
    statements: [
      `UPDATE dictionaries SET isBase = 1 WHERE name = 'TK_EMOTIONS';`,
    ],
  },
  {
    toVersion: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS termMetrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        termId INTEGER NOT NULL,
        metricId INTEGER NOT NULL,
        FOREIGN KEY(termId) REFERENCES terms(id) ON DELETE CASCADE,
        FOREIGN KEY(metricId) REFERENCES metrics(id) ON DELETE CASCADE,
        UNIQUE(termId, metricId)
      );`,
    ],
  },
  {
    toVersion: 4,
    statements: [
      `ALTER TABLE dictionaries RENAME TO lists;`,
      `ALTER TABLE terms RENAME TO items;`,
      `ALTER TABLE items RENAME COLUMN dictionaryId TO listId;`,
      `ALTER TABLE actionDictionaries RENAME TO actionLists;`,
      `ALTER TABLE actionLists RENAME COLUMN dictionaryId TO listId;`,
      `ALTER TABLE activityTerms RENAME TO activityItems;`,
      `ALTER TABLE activityItems RENAME COLUMN termId TO itemId;`,
      `ALTER TABLE termMetrics RENAME TO itemMetrics;`,
      `ALTER TABLE itemMetrics RENAME COLUMN termId TO itemId;`,
      `ALTER TABLE streaks RENAME COLUMN termId TO itemId;`,
    ],
  },
];
