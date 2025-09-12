import { Injectable } from '@angular/core';
import { IActionCreateDto } from '../db/models/action';
import { db } from '../db/db';
import { ActivityActionService } from './activity-action.service';
import { getActionsFromString } from '../functions/action';

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  constructor(private activityActionService: ActivityActionService) { }

  async add(actionDto: IActionCreateDto, activityId?: number) {
    const actionDuplication = await db.actions
      .where('name')
      .equalsIgnoreCase(actionDto.name)
      .first();

    if (activityId && actionDuplication) {
      await this.activityActionService.add({
        activityId,
        actionId: actionDuplication.id,
      });

      return actionDuplication.id;
    }

    if (activityId && !actionDuplication) {
      const actionId = await db.actions.add(actionDto);
      this.activityActionService.add({
        activityId,
        actionId,
      })

      return actionId;
    }

    if (!activityId && !actionDuplication) {
      const actionId = await db.actions.add(actionDto);

      return actionId;
    }

    return null;
  }

  async addFromString(actionsString: string, activityId?: number) {
    const result = [];
    const actions = getActionsFromString(actionsString);

    for (const action of actions) {
      const actionId = await this.add(action, activityId);
      result.push(actionId);
    }

    return result;
  }

  async get(id: number) {
    return db.actions.get(id);
  }

  async getList(ids: number[]) {
    return db.actions
      .where('id')
      .anyOf(ids)
      .toArray();
  }

  async updateFromString(actionsString: string, activityId: number) {
    const currentActions = await this.getByActivityId(activityId);
    const formActions = getActionsFromString(actionsString);

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
      await this.add(action, activityId);
    }
  }

  async getByActivityId(id: number) {
    const activityActions = await this.activityActionService.getByActivityId(id);
    const actionIds = activityActions.map((activityAction) => activityAction.actionId);
    return db.actions
      .where('id')
      .anyOf(actionIds)
      .toArray();
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
}
