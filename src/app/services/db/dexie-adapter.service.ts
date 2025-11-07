import { Injectable } from '@angular/core';
import { db } from '../../db/db';
import Dexie from 'dexie';
import { IDatabaseAdapter } from './database-adapter.interface';
import { CreateDtoFor, RowFor, TableName, Where } from './types';

@Injectable({ providedIn: 'root' })
export abstract class DexieAdapter implements IDatabaseAdapter {
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

    async getAll<K extends TableName>(table: K, where?: Where): Promise<RowFor<K>[]> {
        const tableRef = (db as any)[table];

        if (where) {    
            if (where.OR) {
                return await Promise.all(
                    where.OR.map((condition) => {
                        const [key, value] = Object.entries(condition)[0];
                        return tableRef.where(key).equals(value).toArray();
                    })
                );
            } else {
                const keys = Object.keys(where).filter((key) => !['OR', 'AND', 'NOT'].includes(key));
                const column = (keys.length == 1) ? keys[0] : '[' + keys.join('+') + ']';
                const value = (keys.length == 1) ? where[column] : Object.values(where);

                return tableRef
                    .where(column)
                    .equals(value)
                    .toArray();
            }
        }

        return tableRef.toArray();
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
        changes: Partial<CreateDtoFor<K>>,
    ): Promise<number> {
        return (db as any)[table].update(id, changes);
    }

    async delete<K extends TableName>(
        table: K,
        where: Where,
    ): Promise<void> {
        const tableRef = (db as any)[table];

        if (where.OR) {
            await Promise.all(
                where.OR.map((condition) => {
                    const [key, value] = Object.entries(condition)[0];
                    
                    return tableRef.where(key)
                        .equals(value)
                        .delete();
                })
            );
        } else {
            const keys = Object.keys(where).filter((key) => !['OR', 'AND', 'NOT'].includes(key));
            const column = (keys.length == 1) ? keys[0] : '[' + keys.join('+') + ']';
            const value = (keys.length == 1) ? where[column] : Object.values(where);

            return tableRef
                .where(column)
                .equals(value)
                .delete();
        }
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
