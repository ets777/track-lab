import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActivityTagService extends DatabaseService<'activityTags'> {
    protected tableName: 'activityTags' = 'activityTags';

    async getByActivityId(activityId: number) {
        return this.getAllWhereEquals('activityId', activityId);
    }

    async deleteByActivityIdAndTagId(activityId: number, tagId: number) {
        return this.delete({ activityId, tagId });
    }

    async deleteByActivityId(activityId: number) {
        return this.delete({ activityId });
    }

    async deleteByTagId(tagId: number) {
        return this.delete({ tagId });
    }
}
