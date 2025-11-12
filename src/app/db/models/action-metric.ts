import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActionMetricDb {
    id: number;
    actionId: number;
    metricId: number;
}

export type IActionMetricCreateDto = WithOptionalId<IActionMetricDb>;

export interface IActionMetric extends IActionMetricDb {}
