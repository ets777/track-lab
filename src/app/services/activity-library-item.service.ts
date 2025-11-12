import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActivityLibraryItemService extends DatabaseService<'activityLibraryItems'> {
    protected tableName: 'activityLibraryItems' = 'activityLibraryItems';

    async getByActivityId(activityId: number) {
        return this.getAllWhereEquals('activityId', activityId);
    }
}
