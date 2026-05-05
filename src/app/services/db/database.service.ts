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

  async add(dto: CreateDtoFor<K>): Promise<number> {
    const result = await this.adapter.add(this.tableName, dto);
    this.cacheService.invalidateAll();
    return result;
  }

  async bulkAdd(dtos: CreateDtoFor<K>[]): Promise<number[]> {
    const result = await this.adapter.bulkAdd(this.tableName, dtos);
    this.cacheService.invalidateAll();
    return result;
  }

  async getById(id: number): Promise<RowFor<K> | undefined> {
    const key = this.key('getById', id);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getById(this.tableName, id);
    this.cacheService.set(key, result);
    return result;
  }

  async getAll(where?: Where): Promise<RowFor<K>[]> {
    const key = this.key('getAll', where);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAll(this.tableName, where);
    this.cacheService.set(key, result);
    return result;
  }

  async getFirstWhereEquals(columnName: string, value: string | number): Promise<RowFor<K> | undefined> {
    const key = this.key('getFirstWhereEquals', [columnName, value]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getFirstWhereEquals(this.tableName, columnName, value);
    this.cacheService.set(key, result);
    return result;
  }

  async getFirstWhereEqualsIgnoringCase(columnName: string, value: string): Promise<RowFor<K> | undefined> {
    const key = this.key('getFirstWhereEqualsIgnoringCase', [columnName, value]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getFirstWhereEqualsIgnoringCase(this.tableName, columnName, value);
    this.cacheService.set(key, result);
    return result;
  }

  async getAllWhereEquals(columnName: string, value: string | number | boolean): Promise<RowFor<K>[]> {
    const key = this.key('getAllWhereEquals', [columnName, value]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAllWhereEquals(this.tableName, columnName, value);
    this.cacheService.set(key, result);
    return result;
  }

  async getAnyOf(columnName: string, values: string[] | number[]): Promise<RowFor<K>[]> {
    const key = this.key('getAnyOf', [columnName, values]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAnyOf(this.tableName, columnName, values);
    this.cacheService.set(key, result);
    return result;
  }

  async getAllByRange(columnName: string, range: { 0: any; 1: any; }): Promise<RowFor<K>[]> {
    const key = this.key('getAllByRange', [columnName, range]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAllByRange(this.tableName, columnName, range);
    this.cacheService.set(key, result);
    return result;
  }

  async getAllBetweenOrderedBy(
    columnName: string,
    orderByColumn: string,
    startValue: string | number,
    endValue: string | number
  ): Promise<RowFor<K>[]> {
    const key = this.key('getAllBetweenOrderedBy', [columnName, orderByColumn, startValue, endValue]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K>[]>(key);
    const result = await this.adapter.getAllBetweenOrderedBy(
      this.tableName,
      columnName,
      orderByColumn,
      startValue,
      endValue
    );
    this.cacheService.set(key, result);
    return result;
  }

  async update(id: number, changes: Partial<CreateDtoFor<K>>): Promise<number> {
    const result = await this.adapter.update(this.tableName, id, changes);
    this.cacheService.invalidateAll();
    return result;
  }

  async delete(where: Where): Promise<void> {
    await this.adapter.delete(this.tableName, where);
    this.cacheService.invalidateAll();
  }

  async getLast(columns: string[]): Promise<RowFor<K> | undefined> {
    const key = this.key('getLast', columns);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getLast(this.tableName, columns);
    this.cacheService.set(key, result);
    return result;
  }

  async getLastBeforeDate(columns: string[], date: string): Promise<RowFor<K> | undefined> {
    const key = this.key('getLastBeforeDate', [columns, date]);
    if (this.cacheService.has(key)) return this.cacheService.get<RowFor<K> | undefined>(key);
    const result = await this.adapter.getLastBeforeDate(this.tableName, columns, date);
    this.cacheService.set(key, result);
    return result;
  }

  async clear(): Promise<void> {
    await this.adapter.clear(this.tableName);
    this.cacheService.invalidateAll();
  }

  async count(): Promise<number> {
    const key = this.key('count');
    if (this.cacheService.has(key)) return this.cacheService.get<number>(key);
    const result = await this.adapter.count(this.tableName);
    this.cacheService.set(key, result);
    return result;
  }
}
