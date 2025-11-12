import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActivityMetricService extends DatabaseService<'activityMetrics'> {
    protected tableName: 'activityMetrics' = 'activityMetrics';

    async getByActivityId(activityId: number) {
        return this.getAllWhereEquals('activityId', activityId);
    }
}
