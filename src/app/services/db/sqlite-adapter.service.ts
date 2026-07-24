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

  private toColsAndPlaceholders(obj: Record<string, any>) {
    const cols = Object.keys(obj);
    const vals = cols.map((key) => obj[key] === undefined ? null : obj[key]);
    const placeholders = vals.map(() => '?').join(',');
    return { cols, vals, placeholders };
  }

  async add<K extends TableName>(table: K, row: CreateDtoFor<K>): Promise<number> {
    const { cols, vals, placeholders } = this.toColsAndPlaceholders(row as any);
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
    const res = await this.sqlite.run(sql, vals);

    return res.changes?.lastId ?? 0;
  }

  async bulkAdd<K extends TableName>(table: K, rows: CreateDtoFor<K>[]): Promise<number[]> {
    if (!rows.length) return [];

    const cols = Object.keys(rows[0] as object);
    const chunkSize = 200;

    // Normalize JS values for the parameter binder: booleans -> 0/1, undefined -> null.
    const normalize = (value: any) => {
      if (value === undefined) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    };

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
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = (rows as any[]).slice(i, i + chunkSize);
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

    const placeholders = values.map(() => '?').join(',');

    const result = await this.sqlite.query(
      `SELECT * FROM ${table} WHERE ${columnName} IN (${placeholders})`,
      values,
    );

    return result.values ?? [];
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
    const cols = Object.keys(changes).map(k => `${k} = ?`).join(', ');
    const vals = Object.values(changes);
    const res = await this.sqlite.run(`UPDATE ${table} SET ${cols} WHERE id = ?`, [...vals, id]);

    return res.changes?.changes ?? 0;
  }

  async delete<K extends TableName>(
    table: K,
    where: Where,
  ) {
    const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(' AND ');
    const values = Object.values(where);
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
}
