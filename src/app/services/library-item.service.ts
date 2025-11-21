import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { ActivityLibraryItemService } from './activity-library-item.service';

@Injectable({ providedIn: 'root' })
export class LibraryItemService extends DatabaseService<'libraryItems'> {
  private activityLibraryItemService = inject(ActivityLibraryItemService);

  protected tableName: 'libraryItems' = 'libraryItems';

  async getByActivityId(activityId: number) {
    const activityLibraryItems = await this.activityLibraryItemService.getByActivityId(
      activityId,
    );

    const libraryItemIds = activityLibraryItems.map((activityLibraryItem) => activityLibraryItem.libraryItemId);
    const libraryItems = await this.getAnyOf('id', libraryItemIds);

    return libraryItems;
  }
}
