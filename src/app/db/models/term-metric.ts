import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ITermMetricDb {
    id: number;
    termId: number;
    metricId: number;
}

export type ITermMetricCreateDto = WithOptionalKeys<ITermMetricDb, 'id'>;

export interface ITermMetric extends ITermMetricDb {}
