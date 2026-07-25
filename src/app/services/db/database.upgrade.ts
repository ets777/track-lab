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
  {
    toVersion: 5,
    statements: [
      `INSERT OR IGNORE INTO metrics (name, isBase, isHidden, step, minValue, maxValue, showPreviousValue) VALUES ('TK_MOOD', 1, 0, 1, 1, 10, 1);`,
      `INSERT OR IGNORE INTO metrics (name, isBase, isHidden, step, minValue, maxValue, showPreviousValue) VALUES ('TK_ENERGY', 1, 0, 1, 1, 10, 1);`,
      `INSERT OR IGNORE INTO metrics (name, isBase, isHidden, step, minValue, maxValue, showPreviousValue) VALUES ('TK_SATIETY', 1, 0, 1, 1, 10, 1);`,
      `INSERT OR IGNORE INTO lists (name, isBase) VALUES ('TK_EMOTIONS', 1);`,
      `INSERT OR IGNORE INTO items (listId, name) SELECT id, 'Happiness' FROM lists WHERE name = 'TK_EMOTIONS';`,
      `INSERT OR IGNORE INTO items (listId, name) SELECT id, 'Sadness' FROM lists WHERE name = 'TK_EMOTIONS';`,
      `INSERT OR IGNORE INTO items (listId, name) SELECT id, 'Fear' FROM lists WHERE name = 'TK_EMOTIONS';`,
      `INSERT OR IGNORE INTO items (listId, name) SELECT id, 'Anger' FROM lists WHERE name = 'TK_EMOTIONS';`,
      `INSERT OR IGNORE INTO items (listId, name) SELECT id, 'Disgust' FROM lists WHERE name = 'TK_EMOTIONS';`,
      `INSERT OR IGNORE INTO items (listId, name) SELECT id, 'Surprise' FROM lists WHERE name = 'TK_EMOTIONS';`,
    ],
  },
  {
    toVersion: 6,
    statements: [
      `UPDATE lists SET isBase = 1 WHERE isBase != 1 AND name IN ('TK_EMOTIONS', 'Emotions', 'Эмоции');`,
      `UPDATE metrics SET isBase = 1 WHERE isBase != 1 AND name IN ('TK_MOOD', 'Mood', 'Настроение');`,
      `UPDATE metrics SET isBase = 1 WHERE isBase != 1 AND name IN ('TK_ENERGY', 'Energy', 'Энергия');`,
      `UPDATE metrics SET isBase = 1 WHERE isBase != 1 AND name IN ('TK_SATIETY', 'Satiety', 'Сытость');`,
    ],
  },
  {
    toVersion: 7,
    statements: [
      `CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subjectType TEXT NOT NULL,
        subjectId INTEGER NOT NULL,
        metric TEXT NOT NULL,
        operator TEXT NOT NULL,
        value REAL NOT NULL,
        period TEXT NOT NULL,
        startDate TEXT NOT NULL,
        startTime TEXT,
        endTime TEXT
      );`,
    ],
  },
  {
    toVersion: 8,
    statements: [
      `CREATE TABLE IF NOT EXISTS ruleCompletions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruleId INTEGER NOT NULL,
        periodStart TEXT NOT NULL,
        met INTEGER NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_rule_completions_rule_period ON ruleCompletions (ruleId, periodStart);`,
    ],
  },
  {
    toVersion: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        startDate TEXT,
        endDate TEXT,
        factEndDate TEXT,
        isSuccess INTEGER,
        resultData TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS experimentMetrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experimentId INTEGER NOT NULL,
        metricId INTEGER NOT NULL,
        direction TEXT NOT NULL DEFAULT 'increasing',
        FOREIGN KEY(experimentId) REFERENCES experiments(id) ON DELETE CASCADE,
        FOREIGN KEY(metricId) REFERENCES metrics(id) ON DELETE CASCADE,
        UNIQUE(experimentId, metricId)
      );`,
      `CREATE TABLE IF NOT EXISTS experimentRules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experimentId INTEGER NOT NULL,
        ruleId INTEGER NOT NULL,
        FOREIGN KEY(experimentId) REFERENCES experiments(id) ON DELETE CASCADE,
        FOREIGN KEY(ruleId) REFERENCES rules(id) ON DELETE CASCADE,
        UNIQUE(experimentId, ruleId)
      );`,
      `CREATE TABLE IF NOT EXISTS experimentIndicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experimentId INTEGER NOT NULL,
        subjectType TEXT NOT NULL DEFAULT 'metric',
        subjectId INTEGER NOT NULL,
        direction TEXT NOT NULL DEFAULT 'increasing',
        FOREIGN KEY(experimentId) REFERENCES experiments(id) ON DELETE CASCADE,
        UNIQUE(experimentId, subjectType, subjectId)
      );`,
    ],
  },
  {
    toVersion: 10,
    statements: [
      `CREATE TABLE IF NOT EXISTS appConfig (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );`,
    ],
  },
  {
    toVersion: 11,
    statements: [
      `ALTER TABLE experiments ADD COLUMN failReasonId INTEGER;`,
    ],
  },
  {
    toVersion: 12,
    statements: [
      `DROP TABLE IF EXISTS streaks;`,
    ],
  },
  {
    toVersion: 13,
    statements: [
      `CREATE TABLE IF NOT EXISTS listLinks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listId INTEGER NOT NULL,
        subjectType TEXT NOT NULL DEFAULT 'action',
        subjectId INTEGER NOT NULL,
        FOREIGN KEY(listId) REFERENCES lists(id) ON DELETE CASCADE,
        UNIQUE(listId, subjectType, subjectId)
      );`,
      `INSERT INTO listLinks (listId, subjectType, subjectId)
        SELECT listId, 'action', actionId FROM actionLists;`,
      `DROP TABLE IF EXISTS actionLists;`,
    ],
  },
  {
    toVersion: 14,
    statements: [
      `ALTER TABLE rules ADD COLUMN endDate TEXT;`,
    ],
  },
  {
    toVersion: 15,
    // Every link table is indexed on its first UNIQUE column, so lookups by
    // that column are covered — but lookups by the *second* one fell back to a
    // full scan. Stats read activityMetrics by metricId, and the polymorphic
    // subject cleanup reads rules / listLinks / experimentIndicators by
    // (subjectType, subjectId); both grow with history.
    statements: [
      `CREATE INDEX IF NOT EXISTS idxActivityMetricsMetricId ON activityMetrics(metricId);`,
      `CREATE INDEX IF NOT EXISTS idxActivityActionsActionId ON activityActions(actionId);`,
      `CREATE INDEX IF NOT EXISTS idxActivityTagsTagId ON activityTags(tagId);`,
      `CREATE INDEX IF NOT EXISTS idxActivityItemsItemId ON activityItems(itemId);`,
      `CREATE INDEX IF NOT EXISTS idxRulesSubject ON rules(subjectType, subjectId);`,
      `CREATE INDEX IF NOT EXISTS idxListLinksSubject ON listLinks(subjectType, subjectId);`,
      `CREATE INDEX IF NOT EXISTS idxExperimentIndicatorsSubject ON experimentIndicators(subjectType, subjectId);`,
      // experimentMetrics was superseded by experimentIndicators in v9 and was
      // never read or written since; it was also absent from backups.
      `DROP TABLE IF EXISTS experimentMetrics;`,
    ],
  },
];
