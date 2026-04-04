import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IItemMetricDb {
    id: number;
    itemId: number;
    metricId: number;
}

export type IItemMetricCreateDto = WithOptionalKeys<IItemMetricDb, 'id'>;

export interface IItemMetric extends IItemMetricDb {}
