import { Injectable } from '@angular/core';
import { CreateDtoFor, RowFor, TableName, Where } from './types';
import { IDatabaseAdapter } from './database-adapter.interface';
import { SQLiteService } from './sqlite.service';

@Injectable({ providedIn: 'root' })
export abstract class SqliteAdapter implements IDatabaseAdapter {
    constructor(private sqlite: SQLiteService) { }
    
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

    async bulkAdd<K extends TableName>(table: K, rows: CreateDtoFor<K>[]) {
        const ids: number[] = [];
        try {
            await this.sqlite.beginTransaction();

            for (const r of rows) {
                ids.push(await this.add(table, r));
            }
            
            await this.sqlite.commitTransaction();
        } catch (e) {
            await this.sqlite.rollbackTransaction();
            throw e; 
        }

        return ids;
    }

    async getById<K extends TableName>(table: K, id: number): Promise<RowFor<K> | undefined> {
        const result = await this.sqlite.query(
            `SELECT * FROM ${table} WHERE id = ? LIMIT 1`, 
            [id],
        );

        return result.values?.[0];
    }

    async getAll<K extends TableName>(table: K) {
        const result = await this.sqlite.query(`SELECT * FROM ${table}`);
        
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
             WHERE ${columnName} BETWEEN ? AND ? 
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
        const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(', ');
        const values = Object.values(where);
        await this.sqlite.run(`DELETE FROM ${table} WHERE ${whereClause}`, [...values]);
    }

    async getLast<K extends TableName>(
        table: K,
        columns: string[],
    ): Promise<RowFor<K> | undefined> {
        const orderBy = columns.join(', ');

        const result = await this.sqlite.query(
            `SELECT * FROM ${table} ORDER BY ${orderBy} DESC LIMIT 1`
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
        const orderBy = columns.join(', ');

        const result = await this.sqlite.query(
            `SELECT * FROM ${table} WHERE ${columns[0]} <= ? ORDER BY ${orderBy} DESC LIMIT 1`,
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
}
