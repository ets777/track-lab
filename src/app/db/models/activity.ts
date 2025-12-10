import { WithOptionalKeys } from "src/app/types/with-optional-keys";
import { IAction } from "./action";
import { ITag } from "./tag";
import { ITerm } from "./term";
import { IActivityMetric } from "./activity-metric";

export interface IActivityDb {
    id: number;
    date: string;
    startTime: string;
    endTime?: string;
    comment?: string;
}

export type IActivityCreateDto = WithOptionalKeys<IActivityDb, 'id'>;

export interface IActivity extends IActivityDb {
    actions: IAction[];
    tags: ITag[];
    terms: ITerm[],
    metricRecords: IActivityMetric[],
}
