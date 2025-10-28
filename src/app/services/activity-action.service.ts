import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

@Injectable({ providedIn: 'root' })
export class ActivityActionService extends DatabaseService<'activityActions'> {
    protected tableName = 'activityActions' as const;

    async getByActivityId(activityId: number) {
        return this.getAllWhereEquals('activityId', activityId);
    }

    async getByActionId(actionId: number) {
        return this.getAllWhereEquals('actionId', actionId);
    }

    async deleteByActivityIdAndActionId(activityId: number, actionId: number) {
        return this.deleteWhereEquals(
            ['activityId', 'actionId'], 
            [activityId, actionId],
        );
    }

    async deleteByActivityId(activityId: number) {
        return this.deleteWhereEquals('activityId', activityId);
    }

    async replaceAction(oldActionId: number, newActionId: number) {
        const relations = await this.getByActionId(oldActionId);

        for (const relation of relations) {
            await this.update(relation.id, {
                actionId: newActionId,
            });
        }
    }
}
