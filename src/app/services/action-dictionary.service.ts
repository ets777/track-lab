import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActionDictionaryService extends DatabaseService<'actionDictionaries'> {
  protected tableName: 'actionDictionaries' = 'actionDictionaries';
}
