import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActionMetricService extends DatabaseService<'actionMetrics'> {
  protected tableName: 'actionMetrics' = 'actionMetrics';
}
