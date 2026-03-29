import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ITagMetricDb {
    id: number;
    tagId: number;
    metricId: number;
}

export type ITagMetricCreateDto = WithOptionalKeys<ITagMetricDb, 'id'>;

export interface ITagMetric extends ITagMetricDb {}
