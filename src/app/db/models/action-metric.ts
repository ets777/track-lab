import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActionMetricDb {
    id: number;
    actionId: number;
    metricId: number;
}

export type IActionMetricCreateDto = WithOptionalKeys<IActionMetricDb, 'id'>;

export interface IActionMetric extends IActionMetricDb {}
