import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class ActionTagService extends DatabaseService<'actionTags'> {
  protected tableName: 'actionTags' = 'actionTags';

  async getByActionId(id: number) {
    return this.getAllWhereEquals('actionId', id);
  }

  async deleteByActionIdAndTagId(actionId: number, tagId: number) {
    return this.delete({ actionId, tagId });
  }

  async deleteByActionId(actionId: number) {
    return this.delete({ actionId });
  }

  async deleteByTagId(tagId: number) {
    return this.delete({ tagId });
  }
}
