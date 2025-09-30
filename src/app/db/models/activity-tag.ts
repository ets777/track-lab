import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActivityTagDb {
    id: number;
    activityId: number;
    tagId: number;
}

export type IActivityTagCreateDto = WithOptionalId<IActivityTagDb>;

export interface IActivityTag extends IActivityTagDb {}
