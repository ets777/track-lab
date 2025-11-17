import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class StreakService extends DatabaseService<'streaks'> {
    protected tableName: 'streaks' = 'streaks';
}
