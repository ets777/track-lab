import { Injectable } from '@angular/core';
import { IAction, IActionCreateDto, IActionDb } from '../db/models/action';
import { db } from '../db/db';
import { ActivityActionService } from './activity-action.service';
import { getEntitiesFromString } from '../functions/string';
import { ITag } from '../db/models/tag';
import { TagService } from './tag.service';

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  constructor(
    private activityActionService: ActivityActionService,
    private tagService: TagService,
  ) { }

  async add(action: IActionCreateDto | IActionDb) {
    return db.actions.add(action);
  }

  async bulkAdd(actions: IActionCreateDto[] | IActionDb[]) {
    const result = [];

    for (const action of actions) {
      result.push(await this.add(action));
    }

    return result;
  }

  async addWithRelation(actionDto: IActionCreateDto, activityId: number) {
    const actionDuplication = await db.actions
      .where('name')
      .equalsIgnoreCase(actionDto.name)
      .first();

    if (actionDuplication) {
      await this.activityActionService.add({
        activityId,
        actionId: actionDuplication.id,
      });

      return actionDuplication.id;
    }

    if (!actionDuplication) {
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

  async get(id: number) {
    return db.actions.get(id);
  }

  async getEnriched(id: number) {
    const action = await db.actions.get(id);

    if (!action) {
      return;
    }

    return this.enrichOne(action);
  }

  async getList(ids: number[]) {
    return db.actions
      .where('id')
      .anyOf(ids)
      .toArray();
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
      await this.activityActionService.delete(activityId, action.id);
    }

    for (const action of actionsToAdd) {
      await this.addWithRelation(action, activityId);
    }
  }

  async getByActivityId(id: number) {
    const activityActions = await this.activityActionService.getByActivityId(id);
    const actionIds = activityActions.map((activityAction) => activityAction.actionId);
    const actions = await db.actions
      .where('id')
      .anyOf(actionIds)
      .toArray();
    
    return this.enrichAll(actions);
  }

  async getAllEnriched() {
    const actions = await this.getAll();
    return this.enrichAll(actions);
  }

  async enrichAll(actionsDb: IActionDb[]) {
    const result = [];

    for (const activityDb of actionsDb) {
      result.push(await this.enrichOne(activityDb));
    }

    return result;
  }

  async enrichOne(actionDb: IActionDb) {
    const tags: ITag[] = await this.tagService.getByActivityId(actionDb.id);

    return {
      ...actionDb,
      tags,
    } as IAction;
  }

  async getAll() {
    return db.actions.toArray();
  }

  async update(id: number, changes: Partial<IActionCreateDto>) {
    return db.actions.update(id, changes);
  }

  async delete(id: number) {
    return db.actions.delete(id);
  }

  async clear() {
    await db.actions.clear();
  }
}
