import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ListService extends DatabaseService<'lists'> {
  protected tableName: 'lists' = 'lists';

  override async getAll() {
    const all = await super.getAll();
    return all.sort((a, b) => ((b.isBase ?? false) ? 1 : 0) - ((a.isBase ?? false) ? 1 : 0));
  }

  async clearNonBase() {
    const lists = await this.getAll();
    for (const list of lists) {
      if (!list.isBase) {
        await this.delete({ id: list.id });
      }
    }
  }
}
