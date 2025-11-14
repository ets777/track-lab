import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IMetricDb {
    id: number;
    name: string;
    isInt: boolean;
    unit?: string;
    minValue?: number;
    maxValue?: number;
}

export type IMetricCreateDto = WithOptionalKeys<IMetricDb, 'id'>;

export interface IMetric extends IMetricDb {}
