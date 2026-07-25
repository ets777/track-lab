import { inject, Injectable } from '@angular/core';
import { DatabaseRouter } from './database-router.service';
import { CreateDtoFor, RowFor, TableName, Where } from './types';
import { CacheService } from '../cache.service';

@Injectable()
export abstract class DatabaseService<K extends TableName> {
  protected abstract tableName: K;

  protected adapter = inject(DatabaseRouter);
  private cacheService = inject(CacheService);

  private key(method: string, args?: unknown): string {
    return `${this.tableName}|${method}|${JSON.stringify(args)}`;
  }

  /**
   * Cache a read, unless a transaction is open.
   *
   * Reads taken inside a transaction see uncommitted rows. If that transaction
   * later rolls back — a failed restore, say — the database reverts but the
   * cached copy would not, leaving phantom rows in memory until the next write
   * to the table. Skipping the write keeps the cache consistent with committed
   * state only.
   */
  private cacheRead<T>(key: string, value: T): T {
    if (!this.adapter.isInTransaction) {
      this.cacheService.set(key, value);
    }
    return value;
  }

  /** Cached reads are only trustworthy outside a transaction. */
  private isCached(key: string): boolean {
    return !this.adapter.isInTransaction && this.cacheService.has(key);
  }

  async add(dto: CreateDtoFor<K>): Promise<number> {
    const result = await this.adapter.add(this.tableName, dto);
    this.cacheService.invalidate(this.tableName);
    return result;
  }

  async bulkAdd(dtos: CreateDtoFor<K>[]): Promise<number[]> {
    const result = await this.adapter.bulkAdd(this.tableName, dtos);
    this.cacheService.invalidate(this.tableName);
    return result;
  }

  async getById(id: number): Promise<RowFor<K> | undefined> {
    const key = this.key('getById', id);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getById(this.tableName, id);
    return this.cacheRead(key, result);
  }

  async getAll(where?: Where): Promise<RowFor<K>[]> {
    const key = this.key('getAll', where);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAll(this.tableName, where);
    return this.cacheRead(key, result);
  }

  async getFirstWhereEquals(columnName: string, value: string | number): Promise<RowFor<K> | undefined> {
    const key = this.key('getFirstWhereEquals', [columnName, value]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getFirstWhereEquals(this.tableName, columnName, value);
    return this.cacheRead(key, result);
  }

  async getFirstWhereEqualsIgnoringCase(columnName: string, value: string): Promise<RowFor<K> | undefined> {
    const key = this.key('getFirstWhereEqualsIgnoringCase', [columnName, value]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getFirstWhereEqualsIgnoringCase(this.tableName, columnName, value);
    return this.cacheRead(key, result);
  }

  async getAllWhereEquals(columnName: string, value: string | number | boolean): Promise<RowFor<K>[]> {
    const key = this.key('getAllWhereEquals', [columnName, value]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAllWhereEquals(this.tableName, columnName, value);
    return this.cacheRead(key, result);
  }

  async getAnyOf(columnName: string, values: string[] | number[]): Promise<RowFor<K>[]> {
    const key = this.key('getAnyOf', [columnName, values]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAnyOf(this.tableName, columnName, values);
    return this.cacheRead(key, result);
  }

  async getAllByRange(columnName: string, range: { 0: any; 1: any; }): Promise<RowFor<K>[]> {
    const key = this.key('getAllByRange', [columnName, range]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAllByRange(this.tableName, columnName, range);
    return this.cacheRead(key, result);
  }

  async getAllBetweenOrderedBy(
    columnName: string,
    orderByColumn: string,
    startValue: string | number,
    endValue: string | number
  ): Promise<RowFor<K>[]> {
    const key = this.key('getAllBetweenOrderedBy', [columnName, orderByColumn, startValue, endValue]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAllBetweenOrderedBy(
      this.tableName,
      columnName,
      orderByColumn,
      startValue,
      endValue
    );
    return this.cacheRead(key, result);
  }

  async update(id: number, changes: Partial<CreateDtoFor<K>>): Promise<number> {
    const result = await this.adapter.update(this.tableName, id, changes);
    this.cacheService.invalidate(this.tableName);
    return result;
  }

  async delete(where: Where): Promise<void> {
    await this.adapter.delete(this.tableName, where);
    this.cacheService.invalidate(this.tableName);
  }

  async getLast(columns: string[]): Promise<RowFor<K> | undefined> {
    const key = this.key('getLast', columns);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getLast(this.tableName, columns);
    return this.cacheRead(key, result);
  }

  async getLastBeforeDate(columns: string[], date: string): Promise<RowFor<K> | undefined> {
    const key = this.key('getLastBeforeDate', [columns, date]);
    if (this.isCached(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getLastBeforeDate(this.tableName, columns, date);
    return this.cacheRead(key, result);
  }

  async clear(): Promise<void> {
    await this.adapter.clear(this.tableName);
    this.cacheService.invalidate(this.tableName);
  }

  async count(): Promise<number> {
    const key = this.key('count');
    if (this.isCached(key)) return this.cacheService.get<number>(key);
    const result = await this.adapter.count(this.tableName);
    return this.cacheRead(key, result);
  }
}
