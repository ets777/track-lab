import { Injectable } from '@angular/core';
import { IActivityActionCreateDto } from '../db/models/activity-action';
import { db } from '../db/db';

@Injectable({
  providedIn: 'root'
})
export class ActivityActionService {
  async add(activityAction: IActivityActionCreateDto) {
    return db.activityActions.add(activityAction);
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
}
