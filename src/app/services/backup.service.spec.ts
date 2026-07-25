import { BackupService } from './backup.service';

/**
 * Both methods under test are pure — `getHelper` parses a version string and
 * `validateBackupShape` only reads the step keys, which are literals. Building
 * the instance off the prototype skips DI entirely: through the injector,
 * BackupService drags in ~27 collaborators and the whole SQLite stack, none of
 * which these cases touch.
 */
function createService(): BackupService {
  return Object.create(BackupService.prototype) as BackupService;
}

/**
 * Covers the two ways a backup file could previously destroy data on import.
 *
 * A backup is untrusted input: it may be truncated, hand-edited, or written by
 * another tool, and the default password is public, so nothing stands between a
 * crafted file and the restore. `getHelper` in particular selects a legacy
 * migration that *overwrites* metrics and lists and empties items — picking it
 * on a bad guess silently wipes the user's data and then reports success.
 */
describe('BackupService.getHelper', () => {
  let service: BackupService;

  beforeEach(() => {
    service = createService();
  });

  it('should select the modern helper for a current version', () => {
    const helper = service.getHelper('1.0.0');
    const backup: any = { version: '1.0.0', metrics: [{ id: 7, name: 'Steps' }] };

    // The modern helper is a pass-through; user metrics survive untouched.
    expect(helper.prepareBackup(backup).metrics).toEqual([{ id: 7, name: 'Steps' }]);
  });

  it('should select the legacy helper for a genuinely old version', () => {
    const helper = service.getHelper('0.4.0');
    const backup: any = { version: '0.4.0', activities: [], actions: [] };

    // The legacy helper rewrites metrics to the three base ones.
    expect(helper.prepareBackup(backup).metrics.length).toBe(3);
  });

  it('should treat a missing version as a genuine pre-0.5.0 file', () => {
    const backup: any = { activities: [], actions: [] };

    expect(service.getHelper('').prepareBackup(backup).metrics.length).toBe(3);
  });

  it('should refuse a partial version rather than guessing low', () => {
    // The bug: "1.0" parsed to NaN, every comparison went false, and the
    // destructive legacy helper was applied to a modern backup.
    expect(() => service.getHelper('1.0')).toThrowError(/Unrecognized backup version/);
  });

  it('should refuse a non-numeric or decorated version', () => {
    expect(() => service.getHelper('abc')).toThrowError(/Unrecognized backup version/);
    expect(() => service.getHelper('1.0.0-evil')).toThrowError(/Unrecognized backup version/);
    expect(() => service.getHelper('1.0.0.0')).toThrowError(/Unrecognized backup version/);
  });

  it('should not throw for versions at the boundary of the version map', () => {
    expect(() => service.getHelper('0.5.0')).not.toThrow();
    expect(() => service.getHelper('0.0.0')).not.toThrow();
  });
});

describe('BackupService.validateBackupShape', () => {
  let service: BackupService;
  // The validator is internal; exercised through the instance.
  let validate: (candidate: unknown) => any;

  beforeEach(() => {
    service = createService();
    validate = (candidate: unknown) => (service as any).validateBackupShape(candidate);
  });

  it('should accept a well-formed backup', () => {
    const result = validate({ version: '1.0.0', actions: [{ id: 1, name: 'Running' }] });

    expect(result.version).toBe('1.0.0');
    expect(result.actions).toEqual([{ id: 1, name: 'Running' }]);
  });

  it('should reject anything that is not an object', () => {
    expect(() => validate(null)).toThrowError(/not an object/);
    expect(() => validate('a string')).toThrowError(/not an object/);
    expect(() => validate([1, 2, 3])).toThrowError(/not an object/);
  });

  it('should reject a table field that is not an array', () => {
    // Without this, `rows.length` on a string passed the guard and
    // Object.keys(rows[0]) produced junk column names.
    expect(() => validate({ version: '1.0.0', actions: 'abc' }))
      .toThrowError(/"actions" is not an array/);
  });

  it('should reject a non-string version', () => {
    expect(() => validate({ version: 3, actions: [] })).toThrowError(/version is not a string/);
  });

  it('should reject a file with no recognizable table', () => {
    expect(() => validate({ version: '1.0.0', unrelated: [{ a: 1 }] }))
      .toThrowError(/no known tables/);
  });

  it('should strip scalar entries from a table array', () => {
    const result = validate({ version: '1.0.0', actions: ['x', 5, null, { id: 1 }] });

    expect(result.actions).toEqual([{ id: 1 }]);
  });

  it('should ignore unknown top-level keys instead of passing them on', () => {
    const result = validate({ version: '1.0.0', actions: [{ id: 1 }], junk: 'ignored' });

    expect(result.junk).toBeUndefined();
  });

  it('should accept the legacy actionLists key for old backups', () => {
    const result = validate({ version: '0.9.0', actionLists: [{ id: 1, actionId: 2, listId: 3 }] });

    expect(result.actionLists.length).toBe(1);
  });
});
