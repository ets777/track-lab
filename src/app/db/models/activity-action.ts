import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActivityActionDb {
    id: number;
    activityId: number;
    actionId: number;
}

export type IActivityActionCreateDto = WithOptionalKeys<IActivityActionDb, 'id'>;

export interface IActivityAction extends IActivityActionDb {}
