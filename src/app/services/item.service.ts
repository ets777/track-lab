import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { ActivityItemService } from './activity-item.service';
import { SubjectReferenceService } from './subject-reference.service';
import { BlockingUsage } from '../types/subject-usage';

@Injectable({ providedIn: 'root' })
export class ItemService extends DatabaseService<'items'> {
  private activityItemService = inject(ActivityItemService);
  private subjectReferenceService = inject(SubjectReferenceService);

  protected tableName: 'items' = 'items';

  /**
   * Delete an item unless something still references it.
   *
   * Rows in `activityItems` / `itemMetrics` go with the item through its
   * foreign keys, but rules, experiment indicators and dashboard widgets point
   * at it by a `(subjectType, subjectId)` pair that nothing cascades. Removing
   * those on the user's behalf silently destroys rules they built, so the
   * delete is refused instead and the caller reports what is using the item.
   *
   * Returns the blocking reference, or null when the item was deleted.
   */
  async deleteIfUnused(id: number): Promise<BlockingUsage | null> {
    const usage = await this.subjectReferenceService.findSubjectUsage('item', id);

    if (usage) {
      const item = await this.getById(id);
      return { usage, name: item?.name ?? '' };
    }

    // Only the links that do not block a delete are left to clean up.
    await this.subjectReferenceService.removeSubjectReferences('item', id);
    await this.delete({ id });

    return null;
  }

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
