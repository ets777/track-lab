import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActivityItemDb {
    id: number;
    activityId: number;
    itemId: number;
}

export type IActivityItemCreateDto = WithOptionalKeys<IActivityItemDb, 'id'>;

export interface IActivityItem extends IActivityItemDb {}
