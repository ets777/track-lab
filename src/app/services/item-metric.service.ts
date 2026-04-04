import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ItemMetricService extends DatabaseService<'itemMetrics'> {
  protected tableName: 'itemMetrics' = 'itemMetrics';
}
