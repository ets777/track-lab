import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActivityTagDb {
    id: number;
    activityId: number;
    tagId: number;
}

export type IActivityTagCreateDto = WithOptionalKeys<IActivityTagDb, 'id'>;

export interface IActivityTag extends IActivityTagDb {}
