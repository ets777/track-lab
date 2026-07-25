import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SqliteAdapter } from './sqlite-adapter.service';
import { SQLiteService } from './sqlite.service';
import { IDatabaseAdapter } from './database-adapter.interface';
import { createSqliteServiceSpy } from './testing/sqlite-service.mock';

@Injectable()
class TestSqliteAdapter extends SqliteAdapter {}

/**
 * Row values are bound as parameters, but column names have to be interpolated
 * into the SQL text. Restored backup rows are untrusted JSON, so their keys
 * must never reach the statement — the adapter resolves columns against the
 * table's real schema instead.
 */
describe('SqliteAdapter column whitelisting', () => {
  let adapter: IDatabaseAdapter;
  let sqlite: jasmine.SpyObj<SQLiteService>;

  beforeEach(() => {
    const spy = createSqliteServiceSpy();

    TestBed.configureTestingModule({
      providers: [
        TestSqliteAdapter,
        { provide: SQLiteService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(TestSqliteAdapter) as IDatabaseAdapter;
    sqlite = TestBed.inject(SQLiteService) as jasmine.SpyObj<SQLiteService>;
  });

  const lastWrite = () => sqlite.run.calls.mostRecent().args as [string, any[]];

  it('should drop a key that is not a real column of the table', async () => {
    await adapter.bulkAdd('actions', [
      { id: 1, name: 'Running', bogusColumn: 'x' } as any,
    ]);

    const [sql] = lastWrite();
    expect(sql).not.toContain('bogusColumn');
    expect(sql).toContain('name');
  });

  it('should not let an injected column name reach the statement', async () => {
    const attack = 'id) VALUES (1); DROP TABLE actions;--';

    await adapter.bulkAdd('actions', [
      { [attack]: 1, name: 'Running' } as any,
    ]);

    const [sql] = lastWrite();
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('INSERT INTO actions (name)');
  });

  it('should throw rather than emit SQL when no key is a real column', async () => {
    await expectAsync(
      adapter.bulkAdd('actions', [{ nothingValid: 1 } as any]),
    ).toBeRejectedWithError(/No known columns/);
  });

  it('should union columns across rows so sparse rows are not truncated', async () => {
    // The column list used to come from row[0] alone, so any field only
    // present on later rows was silently dropped to NULL.
    await adapter.bulkAdd('actions', [
      { id: 1, name: 'Running' } as any,
      { id: 2, name: 'Reading', isHidden: true } as any,
    ]);

    const [sql, params] = lastWrite();
    expect(sql).toContain('isHidden');
    // Booleans are normalized for the binder, and the missing value is NULL.
    expect(params).toContain(1);
    expect(params).toContain(null);
  });

  it('should skip non-object rows a malformed backup may contain', async () => {
    await adapter.bulkAdd('actions', [
      'not-a-row' as any,
      null as any,
      { id: 1, name: 'Running' } as any,
    ]);

    const [sql, params] = lastWrite();
    expect(sql).toContain('INSERT INTO actions');
    // Exactly one row survived: id + name.
    expect(params.length).toBe(2);
  });

  it('should return early for a non-array payload instead of building SQL', async () => {
    await adapter.bulkAdd('actions', 'garbage' as any);

    expect(sqlite.run).not.toHaveBeenCalled();
  });

  it('should filter unknown columns on update too', async () => {
    await adapter.update('actions', 1, { name: 'Walking', bogus: 2 } as any);

    const [sql] = lastWrite();
    expect(sql).toContain('name = ?');
    expect(sql).not.toContain('bogus');
  });

  it('should read the schema once per table and cache it', async () => {
    await adapter.bulkAdd('actions', [{ id: 1, name: 'A' } as any]);
    await adapter.bulkAdd('actions', [{ id: 2, name: 'B' } as any]);

    const pragmaCalls = sqlite.query.calls.all()
      .filter(call => String(call.args[0]).includes('PRAGMA table_info'));

    expect(pragmaCalls.length).toBe(1);
  });
});

describe('SqliteAdapter.getAnyOf', () => {
  let adapter: IDatabaseAdapter;
  let sqlite: jasmine.SpyObj<SQLiteService>;

  beforeEach(() => {
    const spy = createSqliteServiceSpy();

    TestBed.configureTestingModule({
      providers: [
        TestSqliteAdapter,
        { provide: SQLiteService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(TestSqliteAdapter) as IDatabaseAdapter;
    sqlite = TestBed.inject(SQLiteService) as jasmine.SpyObj<SQLiteService>;
  });

  it('should not issue a query for an empty id list', async () => {
    const result = await adapter.getAnyOf('activityActions', 'activityId', []);

    expect(result).toEqual([]);
    expect(sqlite.query).not.toHaveBeenCalled();
  });

  it('should split long id lists so SQLite\'s parameter cap is not exceeded', async () => {
    const ids = Array.from({ length: 1200 }, (_, i) => i + 1);

    await adapter.getAnyOf('activityActions', 'activityId', ids);

    const calls = sqlite.query.calls.all()
      .filter(call => String(call.args[0]).includes('IN ('));

    expect(calls.length).toBe(3);
    for (const call of calls) {
      expect((call.args[1] as any[]).length).toBeLessThanOrEqual(500);
    }
  });
});
