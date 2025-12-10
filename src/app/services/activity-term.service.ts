import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActivityTermService extends DatabaseService<'activityTerms'> {
  protected tableName: 'activityTerms' = 'activityTerms';

  async getByActivityId(activityId: number) {
    return this.getAllWhereEquals('activityId', activityId);
  }
}
