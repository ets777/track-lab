import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { ActivityItemService } from './activity-item.service';
import { SubjectReferenceService } from './subject-reference.service';

@Injectable({ providedIn: 'root' })
export class ItemService extends DatabaseService<'items'> {
  private activityItemService = inject(ActivityItemService);
  private subjectReferenceService = inject(SubjectReferenceService);

  protected tableName: 'items' = 'items';

  /**
   * Delete an item along with the references that do not cascade. Item rows in
   * `activityItems` / `itemMetrics` are removed by their foreign keys; rules,
   * experiment indicators and dashboard widgets are not.
   */
  async deleteWithRelations(id: number) {
    await this.subjectReferenceService.removeSubjectReferences('item', id);

    return this.delete({ id });
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
