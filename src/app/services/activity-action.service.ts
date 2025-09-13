import { Injectable } from '@angular/core';
import { IActivityActionCreateDto, IActivityActionDb } from '../db/models/activity-action';
import { db } from '../db/db';

@Injectable({
  providedIn: 'root'
})
export class ActivityActionService {
  async add(activityAction: IActivityActionCreateDto | IActivityActionDb) {
    return db.activityActions.add(activityAction);
  }

  async bulkAdd(activityActions: IActivityActionCreateDto[] | IActivityActionDb[]) {
    const result = [];

    for (const activityAction of activityActions) {
      result.push(await this.add(activityAction));
    }

    return result;
  }

  async get(id: number) {
    return db.activityActions.get(id);
  }

  async getAll() {
    return db.activityActions.toArray();
  }

  async getByActivityId(id: number) {
    return db.activityActions
      .where('activityId')
      .equals(id)
      .toArray();
  }

  async update(id: number, changes: Partial<IActivityActionCreateDto>) {
    return db.activityActions.update(id, changes);
  }

  async delete(activityId: number, actionId: number) {
    return db.activityActions
      .where('[activityId+actionId]')
      .equals([activityId, actionId])
      .delete();
  }

  async deleteByActivityId(activityId: number) {
    return db.activityActions
      .where('activityId')
      .equals(activityId)
      .delete();
  }

  async clear() {
    await db.activityActions.clear();
  }
}
