import { Injectable } from '@angular/core';
import { IAction, IActionCreateDto, IActionDb } from '../db/models/action';
import { ActivityActionService } from './activity-action.service';
import { getEntitiesFromString } from '../functions/string';
import { ITag } from '../db/models/tag';
import { TagService } from './tag.service';
import { ActionForm } from '../components/action-form/action-form.component';
import { ActionTagService } from './action-tag.service';
import { DatabaseService } from './db/database.service';
import { DatabaseRouter } from './db/database-router.service';

@Injectable({ providedIn: 'root' })
export class ActionService extends DatabaseService<'actions'> {
    protected tableName: 'actions' = 'actions';

    constructor(
        private activityActionService: ActivityActionService,
        private tagService: TagService,
        private actionTagService: ActionTagService,
        adapter: DatabaseRouter,
    ) {
        super(adapter);
    }

    async getEnriched(id: number) {
        const action = await this.getById(id);

        if (!action) {
            return;
        }

        return this.enrichOne(action);
    }

    async addFromForm(action: ActionForm) {
        const existingAction = await this.getByName(action.name);

        if (existingAction) {
            return;
        }

        const actionCreateDto = { 
            name: action.name,
            isHidden: action.isHidden ?? false,
        };
        const actionId = await this.add(actionCreateDto);

        if (!actionId) {
            return;
        }

        await this.tagService.addFromStringWithActionRelation(
            action.tags,
            actionId,
        );

        return actionId;
    }

    async addWithRelation(actionDto: IActionCreateDto, activityId: number) {
        const existingAction = await this.getByName(actionDto.name);

        if (existingAction) {
            await this.activityActionService.add({
                activityId,
                actionId: existingAction.id,
            });

            return existingAction.id;
        }

        if (!existingAction) {
            const actionId = await this.add(actionDto);
            this.activityActionService.add({
                activityId,
                actionId,
            })

            return actionId;
        }

        return null;
    }

    async addFromStringWithRelation(actionsString: string, activityId: number) {
        const result = [];
        const actions = getEntitiesFromString(actionsString);

        for (const action of actions) {
            const actionId = await this.addWithRelation(action, activityId);
            result.push(actionId);
        }

        return result;
    }

    async getByName(name: string) {
        return this.getFirstWhereEqualsIgnoringCase('name', name);
    }

    async getList(ids: number[]) {
        return this.getAnyOf('id', ids);
    }

    async updateFromString(actionsString: string, activityId: number) {
        const currentActions = await this.getByActivityId(activityId);
        const formActions: IActionCreateDto[] = getEntitiesFromString(actionsString);

        const actionsToRemove = currentActions.filter(
            (currentAction) => !formActions.find(
                (formAction) => formAction.name == currentAction.name,
            ),
        );
        const actionsToAdd = formActions.filter(
            (formAction) => !currentActions.find(
                (currentAction) => formAction.name == currentAction.name,
            ),
        );

        for (const action of actionsToRemove) {
            await this.activityActionService.deleteByActivityIdAndActionId(
                activityId, 
                action.id,
            );
        }

        for (const action of actionsToAdd) {
            await this.addWithRelation(action, activityId);
        }
    }

    async getByActivityId(id: number) {
        const activityActions = await this.activityActionService
            .getByActivityId(id);
        const actionIds = activityActions
            .map((activityAction) => activityAction.actionId);

        const actions = await this.getAnyOf('id', actionIds);

        return this.enrichAll(actions);
    }

    async getAllEnriched() {
        const actions = await this.getAll();
        return this.enrichAll(actions);
    }

    async getAllUnhidden() {
        return this.getAllWhereEquals('isHidden', false);
    }

    async enrichAll(actionsDb: IActionDb[]) {
        const result = [];

        for (const activityDb of actionsDb) {
            result.push(await this.enrichOne(activityDb));
        }

        return result;
    }

    async enrichOne(actionDb: IActionDb) {
        const tags: ITag[] = await this.tagService.getByActionId(actionDb.id);

        return {
            ...actionDb,
            tags,
        } as IAction;
    }

    async updateWithTags(id: number, changes: Partial<ActionForm>) {
        await this.tagService.updateFromStringWithActionRelation(
            changes.tags ?? '',
            id,
        );

        delete changes.tags;

        return this.update(id, changes);
    }

    async deleteWithRelations(id: number) {
        await this.actionTagService.deleteByActionId(id);
        
        return this.delete({ id });
    }
}
