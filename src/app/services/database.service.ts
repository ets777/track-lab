import { Injectable } from '@angular/core';
import { db } from '../db/db';
import { IActionCreateDto, IActionDb } from '../db/models/action';
import { ITagCreateDto, ITagDb } from '../db/models/tag';
import Dexie, { Table, UpdateSpec } from 'dexie';
import { IAchievementCreateDto, IAchievementDb } from '../db/models/achievement';
import { IActivityCreateDto, IActivityDb } from '../db/models/activity';
import { IActivityTagCreateDto, IActivityTagDb } from '../db/models/activity-tag';
import { IActivityActionCreateDto, IActivityActionDb } from '../db/models/activity-action';
import { IActionTagCreateDto, IActionTagDb } from '../db/models/action-tag';

export interface ITable {
    actions: IActionDb;
    tags: ITagDb;
    achievements: IAchievementDb;
    activities: IActivityDb;
    activityTags: IActivityTagDb;
    activityActions: IActivityActionDb;
    actionTags: IActionTagDb;
}

export interface ICreateDto {
    actions: IActionCreateDto | IActionDb;
    tags: ITagCreateDto | ITagDb;
    achievements: IAchievementCreateDto | IAchievementDb;
    activities: IActivityCreateDto | IActivityDb;
    activityTags: IActivityTagCreateDto | IActivityTagDb;
    activityActions: IActivityActionCreateDto | IActivityActionDb;
    actionTags: IActionTagCreateDto | IActionTagDb;
}

export type TableName = keyof ITable;
type CreateDtoFor<K extends TableName> = ICreateDto[K];
type RowFor<K extends TableName> = ITable[K];

@Injectable({ providedIn: 'root' })
export abstract class DatabaseService<K extends TableName> {
    protected abstract tableName: K;

    protected get table(): Table<RowFor<K>, number, CreateDtoFor<K>> {
        return db[this.tableName] as Table<RowFor<K>, number, CreateDtoFor<K>>;
    }

    async add(row: CreateDtoFor<K>): Promise<number> {
        return this.table.add(row);
    }

    async bulkAdd(rows: CreateDtoFor<K>[]) {
        const result = [];

        for (const row of rows) {
            result.push(await this.add(row));
        }

        return result;
    }

    async getById(id: number): Promise<RowFor<K> | undefined> {
        return this.table.get(id);
    }

    async getAll(): Promise<RowFor<K>[]> {
        return this.table.toArray();
    }

    async getAllFilter(callback: (...args: any) => boolean): Promise<RowFor<K>[]> {
        return this.table
            .filter(callback)
            .toArray();
    }

    async getFirstWhereEquals(columnName: string, value: string | number): Promise<RowFor<K> | undefined> {
        return this.table
            .where(columnName)
            .equals(value)
            .first();
    }

    async getFirstWhereEqualsIgnoringCase(
        columnName: string, 
        value: string,
    ): Promise<RowFor<K> | undefined> {
        return this.table
            .where(columnName)
            .equalsIgnoreCase(value)
            .first();
    }

    async getAllWhereEquals(columnName: string, value: string | number): Promise<RowFor<K>[]> {
        return this.table
            .where(columnName)
            .equals(value)
            .toArray();
    }

    async getAnyOf(columnName: string, values: string[] | number[]): Promise<RowFor<K>[]> {
        return this.table
            .where(columnName)
            .anyOf(values)
            .toArray();
    }

    async getAllByRange(columnName: string, range: {
        0: any;
        1: any;
    }) {
        return this.table
            .where(columnName)
            .inAnyRange([range])
            .toArray();
    }

    async getAllBetweenOrderedBy(
        columnName: string,
        orderByColumn: string,
        startValue: string | number,
        endValue: string | number,
    ): Promise<RowFor<K>[]> {
        return this.table
            .where(columnName)
            .between(startValue, endValue)
            .sortBy(orderByColumn);
    }

    async update(id: number, changes: UpdateSpec<CreateDtoFor<K>>): Promise<number> {
        return this.table.update(id, changes);
    }

    async delete(id: number): Promise<void> {
        return this.table.delete(id);
    }

    async deleteWhereEquals(columnName: string | string[], value: any): Promise<number> {
        let column;

        if (Array.isArray(columnName)) {
            column = '[' + columnName.join('+') + ']';
        } else {
            column = columnName;
        }
        
        return this.table
            .where(column)
            .equals(value)
            .delete();
    }

    async getLast(columns: string[]) {
        let column;

        if (columns.length > 1) {
            column = '[' + columns.join('+') + ']';
        } else {
            column = columns[0];
        }

        return this.table
            .orderBy(column)
            .last();
    }

    async getLastBeforeDate(columns: string[], date: string) {
        let column;

        if (columns.length > 1) {
            column = '[' + columns.join('+') + ']';
        } else {
            column = columns[0];
        }

        return db.activities
            .where(column)
            .belowOrEqual([date, Dexie.maxKey])
            .last();
    }

    async clear(): Promise<void> {
        return this.table.clear();
    }

    async count(): Promise<number> {
        return this.table.count();
    }
}
