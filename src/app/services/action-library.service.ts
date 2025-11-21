import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActionLibraryService extends DatabaseService<'actionLibraries'> {
  protected tableName: 'actionLibraries' = 'actionLibraries';
}
