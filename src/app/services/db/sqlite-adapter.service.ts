import { inject, Injectable } from '@angular/core';
import { CreateDtoFor, RowFor, TableName, Where } from './types';
import { IDatabaseAdapter } from './database-adapter.interface';
import { SQLiteService } from './sqlite.service';

@Injectable({ providedIn: 'root' })
export abstract class SqliteAdapter implements IDatabaseAdapter {
  private sqlite = inject(SQLiteService);

  protected query(sql: string, params?: any[]) {
    return this.sqlite.query(sql, params);
  }

  /** Real column names per table, read from the DB and cached for the session. */
  private columnCache = new Map<string, Set<string>>();

  /**
   * The set of columns a table actually has, straight from SQLite.
   *
   * Row *values* are always bound as parameters, but column *names* have to be
   * interpolated into the SQL text — so they can never be taken from data.
   * Restored backup rows are attacker-influenced JSON, and their keys would
   * otherwise land verbatim inside the INSERT. Sourcing the whitelist from
   * `PRAGMA table_info` (rather than a hand-kept list) means it cannot drift
   * away from the migrations.
   */
  private async allowedColumns(table: TableName): Promise<Set<string>> {
    const cached = this.columnCache.get(table);
    if (cached) return cached;

    const result = await this.sqlite.query(`PRAGMA table_info(${table})`);
    const columns = new Set<string>(
      (result.values ?? []).map((row: any) => row.name),
    );

    if (!columns.size) {
      throw new Error(`Unknown table: ${table}`);
    }

    this.columnCache.set(table, columns);
    return columns;
  }

  /**
   * Keys of `rows` that are real columns of `table`, in stable order.
   * Unknown keys are dropped rather than thrown on, so a backup written by a
   * newer version still restores the fields this version understands.
   */
  private async resolveColumns(
    table: TableName,
    rows: Record<string, any>[],
  ): Promise<string[]> {
    const allowed = await this.allowedColumns(table);

    // Union across all rows, not just the first: rows may legitimately omit
    // optional fields, and taking row[0]'s keys silently nulled the rest.
    const seen = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (allowed.has(key)) seen.add(key);
      }
    }

    if (!seen.size) {
      throw new Error(`No known columns for table ${table}`);
    }

    return [...seen];
  }

  /** Booleans -> 0/1, undefined/missing -> null, for the parameter binder. */
  private normalize(value: any) {
    if (value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value;
  }

  async add<K extends TableName>(table: K, row: CreateDtoFor<K>): Promise<number> {
    const cols = await this.resolveColumns(table, [row as any]);
    const vals = cols.map((key) => this.normalize((row as any)[key]));
    const placeholders = vals.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
    const res = await this.sqlite.run(sql, vals);

    return res.changes?.lastId ?? 0;
  }

  async bulkAdd<K extends TableName>(table: K, rows: CreateDtoFor<K>[]): Promise<number[]> {
    if (!Array.isArray(rows) || !rows.length) return [];

    // Guard against non-object entries (a malformed backup can supply strings
    // or nulls here); Object.keys on those yields junk column names.
    const objectRows = rows.filter(
      (row): row is CreateDtoFor<K> => !!row && typeof row === 'object' && !Array.isArray(row),
    );
    if (!objectRows.length) return [];

    const cols = await this.resolveColumns(table, objectRows as any[]);
    const chunkSize = 200;
    const normalize = (value: any) => this.normalize(value);

    // When an explicit id is supplied (e.g. backup restore) conflicts are on the
    // primary key, so upsert by id — never REPLACE, which would DELETE the row
    // first and cascade-delete its children. Without an id, insert normally and
    // let any genuine unique-constraint conflict surface as an error.
    const hasId = cols.includes('id');
    const conflictClause = hasId
      ? ` ON CONFLICT(id) DO UPDATE SET ${cols
          .filter(c => c !== 'id')
          .map(c => `${c} = excluded.${c}`)
          .join(', ')}`
      : '';

    const rowPlaceholder = `(${cols.map(() => '?').join(',')})`;

    return this.sqlite.transaction(async () => {
      for (let i = 0; i < objectRows.length; i += chunkSize) {
        const chunk = (objectRows as any[]).slice(i, i + chunkSize);
        const placeholders = chunk.map(() => rowPlaceholder).join(',');
        const values = chunk.flatMap(row => cols.map(col => normalize(row[col])));
        await this.sqlite.run(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders}${conflictClause}`,
          values,
        );
      }

      return [];
    });
  }

  async getById<K extends TableName>(table: K, id: number): Promise<RowFor<K> | undefined> {
    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
      [id],
    );

    return result.values?.[0];
  }

  async getAll<K extends TableName>(table: K, where?: Where): Promise<RowFor<K>[]> {
    if (!where) {
      const result = await this.sqlite.query(`SELECT * FROM ${table}`);
      return result.values ?? [];
    }

    if (where.OR) {
      const conditions = where.OR.map(condition => {
        const key = Object.keys(condition)[0];
        return `${key} = ?`;
      });
      const values = where.OR.map(condition => Object.values(condition)[0]);
      const result = await this.sqlite.query(
        `SELECT * FROM ${table} WHERE ${conditions.join(' OR ')}`,
        values,
      );
      return result.values ?? [];
    }

    const keys = Object.keys(where).filter(k => !['AND', 'OR', 'NOT'].includes(k));
    const conditions = keys.map(k => `${k} = ?`);
    const values = keys.map(k => where[k]);
    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE ${conditions.join(' AND ')}`,
      values,
    );
    return result.values ?? [];
  }

  async getFirstWhereEquals<K extends TableName>(
    table: K,
    columnName: string,
    value: string | number,
  ): Promise<RowFor<K> | undefined> {
    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE ${columnName} = ? LIMIT 1`,
      [value],
    );

    return result.values?.[0];
  }

  async getFirstWhereEqualsIgnoringCase<K extends TableName>(
    table: K,
    columnName: string,
    value: string,
  ): Promise<RowFor<K> | undefined> {
    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE LOWER(${columnName}) = LOWER(?) LIMIT 1`,
      [value],
    );

    return result.values?.[0];
  }

  async getAllWhereEquals<K extends TableName>(
    table: K,
    columnName: string,
    value: string | number,
  ): Promise<RowFor<K>[]> {
    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE ${columnName} = ?`,
      [value],
    );

    return result.values ?? [];
  }

  async getAnyOf<K extends TableName>(
    table: K,
    columnName: string,
    values: (string | number)[],
  ): Promise<RowFor<K>[]> {
    if (!values.length) return [];

    // SQLite caps bound parameters per statement (999 on older builds), so a
    // long id list has to be split rather than sent as one giant IN (...).
    const chunkSize = 500;
    const rows: RowFor<K>[] = [];

    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');

      const result = await this.sqlite.query(
        `SELECT * FROM ${table} WHERE ${columnName} IN (${placeholders})`,
        chunk,
      );

      if (result.values?.length) rows.push(...result.values);
    }

    return rows;
  }

  async getAllByRange<K extends TableName>(
    table: K,
    columnName: string,
    range: [any, any],
  ): Promise<RowFor<K>[]> {
    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE ${columnName} BETWEEN ? AND ?`,
      [range[0], range[1]],
    );

    return result.values ?? [];
  }

  async getAllBetweenOrderedBy<K extends TableName>(
    table: K,
    columnName: string,
    orderByColumn: string,
    startValue: string | number,
    endValue: string | number,
  ): Promise<RowFor<K>[]> {
    const result = await this.sqlite.query(
      `SELECT * FROM ${table}
             WHERE ${columnName} >= ? AND ${columnName} < ?
             ORDER BY ${orderByColumn}`,
      [startValue, endValue],
    );

    return result.values ?? [];
  }

  async update<K extends TableName>(table: K, id: number, changes: Partial<RowFor<K>>) {
    const columns = await this.resolveColumns(table, [changes as any]);
    const assignments = columns.map(c => `${c} = ?`).join(', ');
    const vals = columns.map(c => this.normalize((changes as any)[c]));
    const res = await this.sqlite.run(
      `UPDATE ${table} SET ${assignments} WHERE id = ?`,
      [...vals, id],
    );

    return res.changes?.changes ?? 0;
  }

  async delete<K extends TableName>(
    table: K,
    where: Where,
  ) {
    const columns = await this.resolveColumns(table, [where as any]);
    const whereClause = columns.map((key) => `${key} = ?`).join(' AND ');
    const values = columns.map((key) => this.normalize(where[key]));
    await this.sqlite.run(`DELETE FROM ${table} WHERE ${whereClause}`, [...values]);
  }

  async getLast<K extends TableName>(
    table: K,
    columns: string[],
  ): Promise<RowFor<K> | undefined> {
    const orderBy = columns.map(c => `${c} DESC`).join(', ');

    const result = await this.sqlite.query(
      `SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT 1`
    );

    if (!result.values || result.values.length == 0) {
      return;
    }

    return result.values[0];
  }

  async getLastBeforeDate<K extends TableName>(
    table: K,
    columns: string[],
    date: string,
  ): Promise<RowFor<K> | undefined> {
    const orderBy = columns.map(c => `${c} DESC`).join(', ');

    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE ${columns[0]} <= ? ORDER BY ${orderBy} LIMIT 1`,
      [date]
    );

    if (!result.values || result.values.length == 0) {
      return;
    }

    return result.values[0];
  }

  async clear<K extends TableName>(table: K): Promise<void> {
    await this.sqlite.run(`DELETE FROM ${table}`);
  }

  async count<K extends TableName>(table: K): Promise<number> {
    const row = await this.sqlite.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    return row.values?.[0]?.cnt ?? 0;
  }

  transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.sqlite.transaction(work);
  }

  get isInTransaction(): boolean {
    return this.sqlite.isInTransaction;
  }
}
