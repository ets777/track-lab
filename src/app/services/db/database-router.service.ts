import { Injectable } from "@angular/core";
import { CreateDtoFor, TableName, Where } from "./types";
import { IDatabaseAdapter } from "./database-adapter.interface";
import { DexieAdapter } from "./dexie-adapter.service";
import { SqliteAdapter } from "./sqlite-adapter.service";
import { Preferences } from "@capacitor/preferences";

@Injectable({ providedIn: 'root' })
export class DatabaseRouter implements IDatabaseAdapter {
    private adapter: IDatabaseAdapter;

    constructor(private dexie: DexieAdapter, private sqlite: SqliteAdapter) {
        let useSqlite = false;
        
        Preferences.get({ key: 'migratedToSqlite' })
            .then(({ value }) => useSqlite = (value === 'true'));

        this.adapter = useSqlite ? sqlite : dexie;
    }

    add = <K extends TableName>(table: K, row: CreateDtoFor<K>) => this.adapter.add(table, row);
    bulkAdd = <K extends TableName>(table: K, rows: CreateDtoFor<K>[]) => this.adapter.bulkAdd(table, rows);
    getById = <K extends TableName>(table: K, id: number) => this.adapter.getById(table, id);
    getAll = <K extends TableName>(table: K, where?: Where) => this.adapter.getAll(table, where);
    getFirstWhereEquals = <K extends TableName>(table: K, columnName: string, value: string | number) => this.adapter.getFirstWhereEquals(table, columnName, value);
    getFirstWhereEqualsIgnoringCase = <K extends TableName>(table: K, columnName: string, value: string) => this.adapter.getFirstWhereEqualsIgnoringCase(table, columnName, value);
    getAllWhereEquals = <K extends TableName>(table: K, columnName: string, value: string | number) => this.adapter.getAllWhereEquals(table, columnName, value);
    getAnyOf = <K extends TableName>(table: K, columnName: string, values: string[] | number[]) => this.adapter.getAnyOf(table, columnName, values);
    getAllByRange = <K extends TableName>(table: K, columnName: string, range: { 0: any; 1: any; }) => this.adapter.getAllByRange(table, columnName, range);
    getAllBetweenOrderedBy = <K extends TableName>(table: K, columnName: string, orderByColumn: string, startValue: string | number, endValue: string | number) => this.adapter.getAllBetweenOrderedBy(table, columnName, orderByColumn, startValue, endValue);
    update = <K extends TableName>(table: K, id: number, changes: Partial<CreateDtoFor<K>>) => this.adapter.update(table, id, changes);
    delete = <K extends TableName>(table: K, where: Where) => this.adapter.delete(table, where);
    getLast = <K extends TableName>(table: K, columns: string[]) => this.adapter.getLast(table, columns);
    getLastBeforeDate = <K extends TableName>(table: K, columns: string[], date: string) => this.adapter.getLastBeforeDate(table, columns, date);
    clear = <K extends TableName>(table: K) => this.adapter.clear(table);
    count = <K extends TableName>(table: K) => this.adapter.count(table);
}