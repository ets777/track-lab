import { Injectable } from '@angular/core';
import { ITagCreateDto, ITagDb } from '../db/models/tag';
import { db } from '../db/db';
import { ActivityTagService } from './activity-tag.service';
import { getEntitiesFromString } from '../functions/string';
import { ActionTagService } from './action-tag.service';
import { TagForm } from '../components/tag-form/tag-form.component';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  constructor(
    private activityTagService: ActivityTagService,
    private actionTagService: ActionTagService,
  ) { }

  async add(tag: ITagCreateDto | ITagDb) {
    return db.tags.add(tag);
  }

  async bulkAdd(tags: ITagCreateDto[] | ITagDb[]) {
    const result = [];

    for (const tag of tags) {
      result.push(await this.add(tag));
    }

    return result;
  }

  async addWithActivityRelation(tagDto: ITagCreateDto, activityId: number) {
    const tagDuplication = await db.tags
      .where('name')
      .equalsIgnoreCase(tagDto.name)
      .first();

    if (tagDuplication) {
      await this.activityTagService.add({
        activityId,
        tagId: tagDuplication.id,
      });

      return tagDuplication.id;
    }

    if (!tagDuplication) {
      const tagId = await this.add(tagDto);
      this.activityTagService.add({
        activityId,
        tagId,
      })

      return tagId;
    }

    return null;
  }

  async addWithActionRelation(tagDto: ITagCreateDto, actionId: number) {
    const existingTag = await db.tags
      .where('name')
      .equalsIgnoreCase(tagDto.name)
      .first();
      
    if (existingTag) {
      await this.actionTagService.add({
        actionId,
        tagId: existingTag.id,
      });

      return existingTag.id;
    }

    if (!existingTag) {
      const tagId = await this.add(tagDto);
      await this.actionTagService.add({
        actionId,
        tagId,
      })

      return tagId;
    }

    return null;
  }

  async addFromStringWithActivityRelation(tagsString: string, activityId: number) {
    const result = [];
    const tags = getEntitiesFromString(tagsString);

    for (const tag of tags) {
      const tagId = await this.addWithActivityRelation(tag, activityId);
      result.push(tagId);
    }

    return result;
  }

  async addFromStringWithActionRelation(tagsString: string, actionId: number) {
    const result = [];
    const tags = getEntitiesFromString(tagsString);

    for (const tag of tags) {
      const tagId = await this.addWithActionRelation(tag, actionId);
      result.push(tagId);
    }

    return result;
  }

  async get(id: number) {
    return db.tags.get(id);
  }

  async getList(ids: number[]) {
    return db.tags
      .where('id')
      .anyOf(ids)
      .toArray();
  }

  async updateFromStringWithActivityRelation(tagsString: string, activityId: number) {
    const currentTags = await this.getByActivityId(activityId);
    const formTags = getEntitiesFromString(tagsString);

    const tagsToRemove = currentTags.filter(
      (currentTag) => !formTags.find(
        (formTag) => formTag.name == currentTag.name,
      ),
    );
    const tagsToAdd = formTags.filter(
      (formTag) => !currentTags.find(
        (currentTag) => formTag.name == currentTag.name,
      ),
    );

    for (const tag of tagsToRemove) {
      await this.activityTagService.delete(activityId, tag.id);
    }

    for (const tag of tagsToAdd) {
      await this.addWithActivityRelation(tag, activityId);
    }
  }

  async updateFromStringWithActionRelation(tagsString: string, actionId: number) {
    const currentTags = await this.getByActionId(actionId);
    const formTags = getEntitiesFromString(tagsString);

    const tagsToRemove = currentTags.filter(
      (currentTag) => !formTags.find(
        (formTag) => formTag.name == currentTag.name,
      ),
    );
    const tagsToAdd = formTags.filter(
      (formTag) => !currentTags.find(
        (currentTag) => formTag.name == currentTag.name,
      ),
    );

    for (const tag of tagsToRemove) {
      await this.actionTagService.delete(actionId, tag.id);
    }

    for (const tag of tagsToAdd) {
      await this.addWithActionRelation(tag, actionId);
    }
  }

  async getByActivityId(id: number) {
    const activityTags = await this.activityTagService.getByActivityId(id);
    const tagIds = activityTags.map((activityTag) => activityTag.tagId);
    return db.tags
      .where('id')
      .anyOf(tagIds)
      .toArray();
  }

  async getByActionId(id: number) {
    const actionTags = await this.actionTagService.getByActionId(id);
    const tagIds = actionTags.map((actionTag) => actionTag.tagId);
    return db.tags
      .where('id')
      .anyOf(tagIds)
      .toArray();
  }

  async getAll() {
    return db.tags.toArray();
  }

  async update(id: number, changes: Partial<TagForm>) {
    return db.tags.update(id, changes);
  }

  async delete(id: number) {
    return db.tags.delete(id);
  }

  async clear() {
    await db.tags.clear();
  }
}
