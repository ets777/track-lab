import { WithOptionalId } from "src/app/types/with-optional-id";
import { IAction } from "./action";
import { ITag } from "./tag";

export interface IActivityDb {
    id: number;
    date: string;
    startTime: string;
    endTime?: string;
    mood?: number;
    energy?: number;
    satiety?: number;
    emotions?: string;
    comment?: string;
}

export type IActivityCreateDto = WithOptionalId<IActivityDb>;

export interface IActivity extends IActivityDb {
    actions: IAction[];
    tags: ITag[];
}
