import { Injectable } from '@angular/core';
import { db } from '../../db/db';
import Dexie, { UpdateSpec } from 'dexie';
import { CreateDtoFor, RowFor, TableName } from './types';
import { IDatabaseAdapter } from './database-adapter.interface';

@Injectable({ providedIn: 'root' })
export abstract class SqliteAdapter implements IDatabaseAdapter {
    async add<K extends TableName>(table: K, row: CreateDtoFor<K>): Promise<number> {
        return (db as any)[table].add(row);
    }

    async bulkAdd<K extends TableName>(table: K, rows: CreateDtoFor<K>[]): Promise<number[]> {
        const result = [];

        for (const row of rows) {
            result.push(await this.add(table, row));
        }

        return result;
    }

    async getById<K extends TableName>(table: K, id: number): Promise<RowFor<K> | undefined> {
        return (db as any)[table].get(id);
    }

    async getAll<K extends TableName>(table: K): Promise<RowFor<K>[]> {
        return (db as any)[table].toArray();
    }

    async getAllFilter<K extends TableName>(
        table: K,
        callback: (...args: any) => boolean,
    ): Promise<RowFor<K>[]> {
        return (db as any)[table]
            .filter(callback)
            .toArray();
    }

    async getFirstWhereEquals<K extends TableName>(
        table: K, columnName:
            string, value: string | number,
    ): Promise<RowFor<K> | undefined> {
        return (db as any)[table]
            .where(columnName)
            .equals(value)
            .first();
    }

    async getFirstWhereEqualsIgnoringCase<K extends TableName>(
        table: K,
        columnName: string,
        value: string,
    ): Promise<RowFor<K> | undefined> {
        return (db as any)[table]
            .where(columnName)
            .equalsIgnoreCase(value)
            .first();
    }

    async getAllWhereEquals<K extends TableName>(
        table: K,
        columnName: string,
        value: string | number,
    ): Promise<RowFor<K>[]> {
        return (db as any)[table]
            .where(columnName)
            .equals(value)
            .toArray();
    }

    async getAnyOf<K extends TableName>(
        table: K,
        columnName: string,
        values: string[] | number[],
    ): Promise<RowFor<K>[]> {
        return (db as any)[table]
            .where(columnName)
            .anyOf(values)
            .toArray();
    }

    async getAllByRange<K extends TableName>(
        table: K,
        columnName: string,
        range: {
            0: any;
            1: any;
        }
    ) {
        return (db as any)[table]
            .where(columnName)
            .inAnyRange([range])
            .toArray();
    }

    async getAllBetweenOrderedBy<K extends TableName>(
        table: K,
        columnName: string,
        orderByColumn: string,
        startValue: string | number,
        endValue: string | number,
    ): Promise<RowFor<K>[]> {
        return (db as any)[table]
            .where(columnName)
            .between(startValue, endValue)
            .sortBy(orderByColumn);
    }

    async update<K extends TableName>(
        table: K,
        id: number,
        changes: UpdateSpec<CreateDtoFor<K>>,
    ): Promise<number> {
        return (db as any)[table].update(id, changes);
    }

    async delete<K extends TableName>(table: K, id: number): Promise<void> {
        return (db as any)[table].delete(id);
    }

    async deleteWhereEquals<K extends TableName>(
        table: K,
        columnName: string | string[],
        value: any,
    ): Promise<number> {
        let column;

        if (Array.isArray(columnName)) {
            column = '[' + columnName.join('+') + ']';
        } else {
            column = columnName;
        }

        return (db as any)[table]
            .where(column)
            .equals(value)
            .delete();
    }

    async getLast<K extends TableName>(table: K, columns: string[]): Promise<RowFor<K> | undefined> {
        let column;

        if (columns.length > 1) {
            column = '[' + columns.join('+') + ']';
        } else {
            column = columns[0];
        }

        return (db as any)[table]
            .orderBy(column)
            .last();
    }

    async getLastBeforeDate<K extends TableName>(
        table: K,
        columns: string[],
        date: string,
    ): Promise<RowFor<K> | undefined> {
        let column;

        if (columns.length > 1) {
            column = '[' + columns.join('+') + ']';
        } else {
            column = columns[0];
        }

        return (db as any)[table]
            .where(column)
            .belowOrEqual([date, Dexie.maxKey])
            .last();
    }

    async clear<K extends TableName>(table: K): Promise<void> {
        return (db as any)[table].clear();
    }

    async count<K extends TableName>(table: K): Promise<number> {
        return (db as any)[table].count();
    }
}
