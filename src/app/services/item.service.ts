import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { ActivityItemService } from './activity-item.service';

@Injectable({ providedIn: 'root' })
export class ItemService extends DatabaseService<'items'> {
  private activityItemService = inject(ActivityItemService);

  protected tableName: 'items' = 'items';

  async getByActivityId(activityId: number) {
    const activityItems = await this.activityItemService.getByActivityId(activityId);
    const itemIds = activityItems.map((activityItem) => activityItem.itemId);
    return this.getAnyOf('id', itemIds);
  }

  async getAllUnhidden() {
    const allItems = await this.getAll();
    return allItems.filter((item) => !item.isHidden);
  }
}
