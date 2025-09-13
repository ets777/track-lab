import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActivityActionDb {
    id: number;
    activityId: number;
    actionId: number;
}

export type IActivityActionCreateDto = WithOptionalId<IActivityActionDb>;

export interface IActivityAction extends IActivityActionDb {}
