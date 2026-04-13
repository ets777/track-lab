import { TestBed } from '@angular/core/testing';
import { SqliteAdapter } from './sqlite-adapter.service';
import { SQLiteService } from './sqlite.service';
import { IDatabaseAdapter } from './database-adapter.interface';

// SqliteAdapter is declared abstract but used as a concrete service.
// We extend it here so Angular DI can instantiate it in tests.
class TestSqliteAdapter extends SqliteAdapter {}

describe('SqliteAdapter.getAll', () => {
  // Cast to IDatabaseAdapter: it declares the correct `where?` parameter
  // that SqliteAdapter's implementation is missing (that omission IS the bug).
  let adapter: IDatabaseAdapter;
  let sqliteService: jasmine.SpyObj<SQLiteService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj<SQLiteService>('SQLiteService', ['query', 'run']);
    spy.query.and.returnValue(Promise.resolve({ values: [] }));

    TestBed.configureTestingModule({
      providers: [
        TestSqliteAdapter,
        { provide: SQLiteService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(TestSqliteAdapter) as IDatabaseAdapter;
    sqliteService = TestBed.inject(SQLiteService) as jasmine.SpyObj<SQLiteService>;
  });

  it('should query all rows when called without a where clause', async () => {
    sqliteService.query.and.returnValue(
      Promise.resolve({ values: [{ id: 1 }, { id: 2 }] }),
    );

    const result = await adapter.getAll('actions');

    expect(sqliteService.query).toHaveBeenCalledWith('SELECT * FROM actions');
    expect(result.length).toBe(2);
  });

  it('should apply a single-column WHERE clause when where is provided', async () => {
    sqliteService.query.and.returnValue(
      Promise.resolve({ values: [{ id: 1, name: 'running' }] }),
    );

    await adapter.getAll('actions', { name: 'running' });

    const [sql, params] = sqliteService.query.calls.mostRecent().args;
    expect(sql).toContain('WHERE');
    expect(sql).toContain('name');
    expect(params).toContain('running');
  });

  it('should bind the correct value as a query parameter for a single condition', async () => {
    sqliteService.query.and.returnValue(Promise.resolve({ values: [] }));

    await adapter.getAll('actions', { id: 42 });

    const [, params] = sqliteService.query.calls.mostRecent().args;
    expect(params).toContain(42);
  });

  it('should apply multiple AND conditions when where has multiple keys', async () => {
    sqliteService.query.and.returnValue(Promise.resolve({ values: [] }));

    await adapter.getAll('activityActions', { activityId: 1, actionId: 5 });

    const [sql, params] = sqliteService.query.calls.mostRecent().args;
    expect(sql).toContain('WHERE');
    expect(sql).toContain('activityId');
    expect(sql).toContain('actionId');
    expect(params).toContain(1);
    expect(params).toContain(5);
  });

  it('should apply OR conditions when where.OR is provided', async () => {
    sqliteService.query.and.returnValue(Promise.resolve({ values: [] }));

    await adapter.getAll('activities', {
      OR: [
        { date: '2026-01-01' },
        { date: '2027-01-01' },
      ],
    });

    // At least one query must include a WHERE clause.
    const allCalls = sqliteService.query.calls.allArgs();
    const atLeastOneWithWhere = allCalls.some(([sql]) => (sql as string).includes('WHERE'));
    expect(atLeastOneWithWhere).toBeTrue();

    // All matching date values must be passed as bound parameters.
    const allParams = allCalls.flatMap(([, params]) => params as unknown[]);
    expect(allParams).toContain('2026-01-01');
    expect(allParams).toContain('2027-01-01');
  });

  it('should NOT include a WHERE clause when called without a where argument', async () => {
    sqliteService.query.and.returnValue(Promise.resolve({ values: [] }));

    await adapter.getAll('actions');

    const [sql] = sqliteService.query.calls.mostRecent().args;
    expect(sql).not.toContain('WHERE');
  });
});

describe('SqliteAdapter.getAllBetweenOrderedBy', () => {
  let adapter: IDatabaseAdapter;
  let sqliteService: jasmine.SpyObj<SQLiteService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj<SQLiteService>('SQLiteService', ['query', 'run']);
    spy.query.and.returnValue(Promise.resolve({ values: [] }));

    TestBed.configureTestingModule({
      providers: [
        TestSqliteAdapter,
        { provide: SQLiteService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(TestSqliteAdapter) as IDatabaseAdapter;
    sqliteService = TestBed.inject(SQLiteService) as jasmine.SpyObj<SQLiteService>;
  });

  it('should use >= start and < end (exclusive end) so activities on the end date are excluded', async () => {
    sqliteService.query.and.returnValue(Promise.resolve({ values: [] }));

    await adapter.getAllBetweenOrderedBy('activities', 'date', 'startTime', '2026-04-12', '2026-04-13');

    const [sql, params] = sqliteService.query.calls.mostRecent().args;
    expect(sql).toContain('>=');
    expect(sql).toContain('<');
    expect(sql).not.toContain('BETWEEN');
    expect(params).toEqual(['2026-04-12', '2026-04-13']);
  });

  it('should return only activities whose date falls within [startDate, endDate)', async () => {
    const activityOnTargetDate = { id: 1, date: '2026-04-12', startTime: '10:00' };
    const activityOnNextDate = { id: 2, date: '2026-04-13', startTime: '08:00' };

    // Simulate the DB returning only the activity within range (exclusive end)
    sqliteService.query.and.callFake((_sql: string, params: any[]) => {
      const [start, end] = params as string[];
      const filtered = [activityOnTargetDate, activityOnNextDate].filter(
        a => a.date >= start && a.date < end,
      );
      return Promise.resolve({ values: filtered });
    });

    const result = await adapter.getAllBetweenOrderedBy(
      'activities', 'date', 'startTime', '2026-04-12', '2026-04-13',
    );

    expect(result.length).toBe(1);
    expect((result[0] as any).date).toBe('2026-04-12');
  });

  it('should NOT return an activity added for the next date when querying a single date', async () => {
    const activityOnNextDate = { id: 3, date: '2026-04-13', startTime: '09:00' };

    sqliteService.query.and.callFake((_sql: string, params: any[]) => {
      const [start, end] = params as string[];
      const filtered = [activityOnNextDate].filter(
        a => a.date >= start && a.date < end,
      );
      return Promise.resolve({ values: filtered });
    });

    // Query for 04/12 with end = 04/13 (exclusive)
    const result = await adapter.getAllBetweenOrderedBy(
      'activities', 'date', 'startTime', '2026-04-12', '2026-04-13',
    );

    expect(result.length).toBe(0);
  });

  it('should pass startValue and endValue as bound parameters', async () => {
    await adapter.getAllBetweenOrderedBy('activities', 'date', 'startTime', '2026-01-01', '2026-02-01');

    const [, params] = sqliteService.query.calls.mostRecent().args;
    expect(params).toContain('2026-01-01');
    expect(params).toContain('2026-02-01');
  });
});

describe('SqliteAdapter.delete', () => {
  let adapter: IDatabaseAdapter;
  let sqliteService: jasmine.SpyObj<SQLiteService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj<SQLiteService>('SQLiteService', ['query', 'run']);
    spy.run.and.returnValue(Promise.resolve({ changes: { changes: 1 } }));

    TestBed.configureTestingModule({
      providers: [
        TestSqliteAdapter,
        { provide: SQLiteService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(TestSqliteAdapter) as IDatabaseAdapter;
    sqliteService = TestBed.inject(SQLiteService) as jasmine.SpyObj<SQLiteService>;
  });

  it('should use AND (not comma) to separate multiple WHERE conditions', async () => {
    await adapter.delete('activityActions', { activityId: 1, actionId: 2 });

    const [sql] = sqliteService.run.calls.mostRecent().args;
    expect(sql).toContain('AND');
    expect(sql).not.toMatch(/=\s*\?,\s*\w/);
  });

  it('should bind both values as parameters when deleting by composite key', async () => {
    await adapter.delete('activityActions', { activityId: 5, actionId: 9 });

    const [, params] = sqliteService.run.calls.mostRecent().args;
    expect(params).toContain(5);
    expect(params).toContain(9);
  });

  it('should generate valid SQL for a single-column WHERE clause', async () => {
    await adapter.delete('activityActions', { activityId: 3 });

    const [sql, params] = sqliteService.run.calls.mostRecent().args;
    expect(sql).toContain('WHERE');
    expect(sql).toContain('activityId');
    expect(params).toContain(3);
  });
});
