import { Injectable, inject } from '@angular/core';
import { ITagCreateDto } from '../db/models/tag';
import { ActivityTagService } from './activity-tag.service';
import { getEntitiesFromString } from '../functions/string';
import { ActionTagService } from './action-tag.service';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class TagService extends DatabaseService<'tags'> {
  private activityTagService = inject(ActivityTagService);
  private actionTagService = inject(ActionTagService);

  tableName: 'tags' = 'tags';

  async getAllUnhidden() {
    const allTags = await this.getAll();
    return allTags.filter((tag) => !tag.isHidden);
  }

  async addWithActivityRelation(tagDto: ITagCreateDto, activityId: number) {
    const existingTag = await this.getFirstWhereEqualsIgnoringCase(
      'name',
      tagDto.name,
    );

    if (existingTag) {
      await this.activityTagService.add({
        activityId,
        tagId: existingTag.id,
      });

      return existingTag.id;
    }

    if (!existingTag) {
      const tagId = await this.add(tagDto);
      await this.activityTagService.add({
        activityId,
        tagId,
      })

      return tagId;
    }

    return null;
  }

  async addWithActionRelation(tagDto: ITagCreateDto, actionId: number) {
    const existingTag = await this.getFirstWhereEqualsIgnoringCase(
      'name',
      tagDto.name,
    );

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

  async getList(ids: number[]) {
    return this.getAnyOf('id', ids);
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
      await this.activityTagService.deleteByActivityIdAndTagId(
        activityId,
        tag.id,
      );
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
      await this.actionTagService.deleteByActionIdAndTagId(
        actionId,
        tag.id,
      );
    }

    for (const tag of tagsToAdd) {
      await this.addWithActionRelation(tag, actionId);
    }
  }

  async getByActivityId(id: number) {
    const activityTags = await this.activityTagService.getByActivityId(id);
    const tagIds = activityTags.map((activityTag) => activityTag.tagId);

    return this.getList(tagIds);
  }

  async getByActionId(id: number) {
    const actionTags = await this.actionTagService.getByActionId(id);
    const tagIds = actionTags.map((actionTag) => actionTag.tagId);

    return this.getList(tagIds);
  }

  async deleteWithRelations(id: number) {
    await this.activityTagService.deleteByTagId(id);
    await this.actionTagService.deleteByTagId(id);

    return this.delete({ id });
  }
}
