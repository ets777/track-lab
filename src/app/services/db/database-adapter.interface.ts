import { UpdateSpec } from "dexie";
import { CreateDtoFor, RowFor, TableName } from "./types";

export interface IDatabaseAdapter {
    add<K extends TableName>(table: K, row: CreateDtoFor<K>): Promise<number>;
    bulkAdd<K extends TableName>(table: K, rows: CreateDtoFor<K>[]): Promise<number[]>;
    getById<K extends TableName>(table: K, id: number): Promise<RowFor<K> | undefined>;
    getAll<K extends TableName>(table: K): Promise<RowFor<K>[]>;
    getAllFilter<K extends TableName>(table: K, callback: (...args: any) => boolean): Promise<RowFor<K>[]>;
    getFirstWhereEquals<K extends TableName>(
        table: K, 
        columnName: string, 
        value: string | number,
    ): Promise<RowFor<K> | undefined>;
    getFirstWhereEqualsIgnoringCase<K extends TableName>(
        table: K, 
        columnName: string, 
        value: string,
    ): Promise<RowFor<K> | undefined>;
    getAllWhereEquals<K extends TableName>(table: K, columnName: string, value: string | number): Promise<RowFor<K>[]>;
    getAnyOf<K extends TableName>(table: K, columnName: string, values: string[] | number[]): Promise<RowFor<K>[]>;
    getAllByRange<K extends TableName>(table: K, columnName: string, range: { 0: any; 1: any; }): Promise<RowFor<K>[]>;
    getAllBetweenOrderedBy<K extends TableName>(
        table: K, 
        columnName: string, 
        orderByColumn: string, 
        startValue: string | number, 
        endValue: string | number,
    ): Promise<RowFor<K>[]>;
    update<K extends TableName>(table: K, id: number, changes: UpdateSpec<CreateDtoFor<K>>): Promise<number>;
    delete<K extends TableName>(table: K, id: number): Promise<void>;
    deleteWhereEquals<K extends TableName>(table: K, columnName: string | string[], value: any): Promise<number>;
    getLast<K extends TableName>(table: K, columns: string[]): Promise<RowFor<K> | undefined>;
    getLastBeforeDate<K extends TableName>(table: K, columns: string[], date: string): Promise<RowFor<K> | undefined>;
    clear<K extends TableName>(table: K): Promise<void>;
    count<K extends TableName>(table: K): Promise<number>;
}