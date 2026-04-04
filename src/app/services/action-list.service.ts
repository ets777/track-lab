import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActionListService extends DatabaseService<'actionLists'> {
  protected tableName: 'actionLists' = 'actionLists';
}
