import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class LibraryService extends DatabaseService<'libraries'> {
    protected tableName: 'libraries' = 'libraries';
}
