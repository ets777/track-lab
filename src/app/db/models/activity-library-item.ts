import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActivityLibraryItemDb {
    id: number;
    activityId: number;
    libraryItemId: number;
}

export type IActivityLibraryItemCreateDto = WithOptionalKeys<IActivityLibraryItemDb, 'id'>;

export interface IActivityLibraryItem extends IActivityLibraryItemDb {}
