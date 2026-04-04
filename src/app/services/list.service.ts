import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ListService extends DatabaseService<'lists'> {
  protected tableName: 'lists' = 'lists';
}
