import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class MetricService extends DatabaseService<'metrics'> {
    protected tableName: 'metrics' = 'metrics';
}
