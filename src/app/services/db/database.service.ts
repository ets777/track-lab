import { Injectable } from '@angular/core';
import { DatabaseRouter } from './database-router.service';
import { CreateDtoFor, RowFor, TableName } from './types';
import { UpdateSpec } from 'dexie';

@Injectable()
export abstract class DatabaseService<K extends TableName> {
    protected abstract tableName: K;

    constructor(protected adapter: DatabaseRouter) { }

    add(dto: CreateDtoFor<K>): Promise<number> {
        return this.adapter.add(this.tableName, dto);
    }

    bulkAdd(dtos: CreateDtoFor<K>[]): Promise<number[]> {
        return this.adapter.bulkAdd(this.tableName, dtos);
    }

    getById(id: number): Promise<RowFor<K> | undefined> {
        return this.adapter.getById(this.tableName, id);
    }

    getAll(): Promise<RowFor<K>[]> {
        return this.adapter.getAll(this.tableName);
    }

    getAllFilter(callback: (...args: any[]) => boolean): Promise<RowFor<K>[]> {
        return this.adapter.getAllFilter(this.tableName, callback);
    }

    getFirstWhereEquals(columnName: string, value: string | number): Promise<RowFor<K> | undefined> {
        return this.adapter.getFirstWhereEquals(this.tableName, columnName, value);
    }

    getFirstWhereEqualsIgnoringCase(columnName: string, value: string): Promise<RowFor<K> | undefined> {
        return this.adapter.getFirstWhereEqualsIgnoringCase(this.tableName, columnName, value);
    }

    getAllWhereEquals(columnName: string, value: string | number): Promise<RowFor<K>[]> {
        return this.adapter.getAllWhereEquals(this.tableName, columnName, value);
    }

    getAnyOf(columnName: string, values: string[] | number[]): Promise<RowFor<K>[]> {
        return this.adapter.getAnyOf(this.tableName, columnName, values);
    }

    getAllByRange(columnName: string, range: { 0: any; 1: any; }): Promise<RowFor<K>[]> {
        return this.adapter.getAllByRange(this.tableName, columnName, range);
    }

    getAllBetweenOrderedBy(
        columnName: string,
        orderByColumn: string,
        startValue: string | number,
        endValue: string | number
    ): Promise<RowFor<K>[]> {
        return this.adapter.getAllBetweenOrderedBy(
            this.tableName,
            columnName,
            orderByColumn,
            startValue,
            endValue
        );
    }

    update(id: number, changes: UpdateSpec<CreateDtoFor<K>>): Promise<number> {
        return this.adapter.update(this.tableName, id, changes);
    }

    delete(id: number): Promise<void> {
        return this.adapter.delete(this.tableName, id);
    }

    deleteWhereEquals(columnName: string | string[], value: any): Promise<number> {
        return this.adapter.deleteWhereEquals(this.tableName, columnName, value);
    }

    getLast(columns: string[]): Promise<RowFor<K> | undefined> {
        return this.adapter.getLast(this.tableName, columns);
    }

    getLastBeforeDate(columns: string[], date: string): Promise<RowFor<K> | undefined> {
        return this.adapter.getLastBeforeDate(this.tableName, columns, date);
    }

    clear(): Promise<void> {
        return this.adapter.clear(this.tableName);
    }

    count(): Promise<number> {
        return this.adapter.count(this.tableName);
    }
}
