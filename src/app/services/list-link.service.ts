import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ListLinkService extends DatabaseService<'listLinks'> {
  protected tableName: 'listLinks' = 'listLinks';
}
