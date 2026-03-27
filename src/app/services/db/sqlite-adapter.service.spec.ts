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
