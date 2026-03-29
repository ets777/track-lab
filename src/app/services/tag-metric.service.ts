import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class TagMetricService extends DatabaseService<'tagMetrics'> {
  protected tableName: 'tagMetrics' = 'tagMetrics';
}
