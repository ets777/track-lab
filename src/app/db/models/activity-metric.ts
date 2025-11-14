import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActivityMetricDb {
    id: number;
    activityId: number;
    metricId: number;
    value: number;
}

export type IActivityMetricCreateDto = WithOptionalKeys<IActivityMetricDb, 'id'>;

export interface IActivityMetric extends IActivityMetricDb {}
