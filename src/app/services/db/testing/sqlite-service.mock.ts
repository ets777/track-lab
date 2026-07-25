import { SQLiteService } from '../sqlite.service';

/**
 * Column lists for the tables used in specs.
 *
 * The adapter asks SQLite for a table's real columns (`PRAGMA table_info`)
 * before building any INSERT/UPDATE/DELETE, so a mocked SQLiteService has to
 * answer that query or every write path fails. Keep these in sync with
 * `database.upgrade.ts` for the tables a spec touches.
 */
export const MOCK_TABLE_COLUMNS: Record<string, string[]> = {
  actions: ['id', 'name', 'isHidden'],
  tags: ['id', 'name', 'isHidden'],
  activities: ['id', 'date', 'startTime', 'endTime', 'comment'],
  activityActions: ['id', 'activityId', 'actionId'],
  activityTags: ['id', 'activityId', 'tagId'],
  activityMetrics: ['id', 'activityId', 'metricId', 'value'],
  metrics: [
    'id', 'name', 'isBase', 'isHidden', 'step', 'unit',
    'minValue', 'maxValue', 'showPreviousValue',
  ],
  rules: [
    'id', 'subjectType', 'subjectId', 'metric', 'operator', 'value',
    'period', 'startDate', 'endDate', 'startTime', 'endTime',
  ],
  listLinks: ['id', 'listId', 'subjectType', 'subjectId'],
  experimentIndicators: ['id', 'experimentId', 'subjectType', 'subjectId', 'direction'],
};

const PRAGMA = /^PRAGMA table_info\((\w+)\)$/;

/**
 * A SQLiteService spy that answers `PRAGMA table_info` from MOCK_TABLE_COLUMNS
 * and delegates every other query to `queryResult`, which specs can override.
 */
export function createSqliteServiceSpy(): jasmine.SpyObj<SQLiteService> {
  const spy = jasmine.createSpyObj<SQLiteService>(
    'SQLiteService',
    ['query', 'run', 'transaction'],
  );

  // Default non-PRAGMA response; specs override via setQueryResult below.
  let queryResult: any = { values: [] };

  spy.query.and.callFake((statement: string) => {
    const pragma = PRAGMA.exec(statement.trim());

    if (pragma) {
      const columns = MOCK_TABLE_COLUMNS[pragma[1]] ?? [];
      return Promise.resolve({ values: columns.map((name) => ({ name })) } as any);
    }

    return Promise.resolve(queryResult);
  });

  spy.run.and.returnValue(Promise.resolve({ changes: { changes: 1, lastId: 1 } } as any));
  spy.transaction.and.callFake((work: () => Promise<any>) => work());

  (spy as any).setQueryResult = (result: any) => { queryResult = result; };

  return spy;
}

/** Set the response returned for non-PRAGMA queries. */
export function setQueryResult(spy: jasmine.SpyObj<SQLiteService>, result: any): void {
  (spy as any).setQueryResult(result);
}

/** The SQL of the most recent non-PRAGMA query. */
export function lastQuery(spy: jasmine.SpyObj<SQLiteService>): [string, any[]] {
  const calls = spy.query.calls.all()
    .map((call) => call.args as [string, any[]])
    .filter(([statement]) => !PRAGMA.test(statement.trim()));

  return calls[calls.length - 1];
}
