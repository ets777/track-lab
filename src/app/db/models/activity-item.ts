import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActivityTermDb {
    id: number;
    activityId: number;
    termId: number;
}

export type IActivityTermCreateDto = WithOptionalKeys<IActivityTermDb, 'id'>;

export interface IActivityTerm extends IActivityTermDb {}
