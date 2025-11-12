import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActivityMetricDb {
    id: number;
    activityId: number;
    metricId: number;
    value: number;
}

export type IActivityMetricCreateDto = WithOptionalId<IActivityMetricDb>;

export interface IActivityMetric extends IActivityMetricDb {}
