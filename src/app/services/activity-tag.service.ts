import { Injectable } from '@angular/core';
import { IActivityTagCreateDto, IActivityTagDb } from '../db/models/activity-tag';
import { db } from '../db/db';

@Injectable({
  providedIn: 'root'
})
export class ActivityTagService {
  async add(activityTag: IActivityTagCreateDto | IActivityTagDb) {
    return db.activityTags.add(activityTag);
  }

  async bulkAdd(activityTags: IActivityTagCreateDto[] | IActivityTagDb[]) {
    const result = [];

    for (const activityTag of activityTags) {
      result.push(await this.add(activityTag));
    }

    return result;
  }

  async get(id: number) {
    return db.activityTags.get(id);
  }

  async getAll() {
    return db.activityTags.toArray();
  }

  async getByActivityId(id: number) {
    return db.activityTags
      .where('activityId')
      .equals(id)
      .toArray();
  }

  async update(id: number, changes: Partial<IActivityTagCreateDto>) {
    return db.activityTags.update(id, changes);
  }

  async delete(activityId: number, tagId: number) {
    return db.activityTags
      .where('[activityId+tagId]')
      .equals([activityId, tagId])
      .delete();
  }

  async deleteByActivityId(activityId: number) {
    return db.activityTags
      .where('activityId')
      .equals(activityId)
      .delete();
  }

  async clear() {
    await db.activityTags.clear();
  }
}
