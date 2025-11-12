import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { DatabaseRouter } from './db/database-router.service';
import { ActivityLibraryItemService } from './activity-library-item.service';

@Injectable({ providedIn: 'root' })
export class LibraryItemService extends DatabaseService<'libraryItems'> {
    protected tableName: 'libraryItems' = 'libraryItems';

    constructor(
        private activityLibraryItemService: ActivityLibraryItemService,
        adapter: DatabaseRouter,
    ) {
        super(adapter);
    }

    async getByActivityId(activityId: number) {
        const activityLibraryItems = await this.activityLibraryItemService.getByActivityId(
            activityId,
        );

        const libraryItemIds = activityLibraryItems.map((activityLibraryItem) => activityLibraryItem.libraryItemId);
        const libraryItems = await this.getAnyOf('id', libraryItemIds);

        return libraryItems;
    }
}
