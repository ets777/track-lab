import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActivityLibraryItemDb {
    id: number;
    activityId: number;
    libraryItemId: number;
}

export type IActivityLibraryItemCreateDto = WithOptionalId<IActivityLibraryItemDb>;

export interface IActivityLibraryItem extends IActivityLibraryItemDb {}
