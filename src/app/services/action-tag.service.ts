import { Injectable } from '@angular/core';
import { IActionTagCreateDto, IActionTagDb } from '../db/models/action-tag';
import { db } from '../db/db';

@Injectable({
  providedIn: 'root'
})
export class ActionTagService {
  async add(actionTag: IActionTagCreateDto | IActionTagDb) {
    return db.actionTags.add(actionTag);
  }

  async bulkAdd(actionTags: IActionTagCreateDto[] | IActionTagDb[]) {
    const result = [];

    for (const actionTag of actionTags) {
      result.push(await this.add(actionTag));
    }

    return result;
  }

  async get(id: number) {
    return db.actionTags.get(id);
  }

  async getAll() {
    return db.actionTags.toArray();
  }

  async getByActionId(id: number) {
    return db.actionTags
      .where('actionId')
      .equals(id)
      .toArray();
  }

  async update(id: number, changes: Partial<IActionTagCreateDto>) {
    return db.actionTags.update(id, changes);
  }

  async delete(actionId: number, tagId: number) {
    return db.actionTags
      .where('[actionId+tagId]')
      .equals([actionId, tagId])
      .delete();
  }

  async deleteByActionId(actionId: number) {
    return db.actionTags
      .where('actionId')
      .equals(actionId)
      .delete();
  }

  async deleteByTagId(tagId: number) {
    return db.actionTags
      .where('tagId')
      .equals(tagId)
      .delete();
  }

  async clear() {
    await db.actionTags.clear();
  }
}
