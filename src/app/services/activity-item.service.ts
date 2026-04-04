import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActivityItemService extends DatabaseService<'activityItems'> {
  protected tableName: 'activityItems' = 'activityItems';

  async getByActivityId(activityId: number) {
    return this.getAllWhereEquals('activityId', activityId);
  }
}
