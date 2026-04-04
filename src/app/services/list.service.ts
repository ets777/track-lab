import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class DictionaryService extends DatabaseService<'dictionaries'> {
  protected tableName: 'dictionaries' = 'dictionaries';
}
