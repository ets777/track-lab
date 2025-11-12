import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IMetricDb {
    id: number;
    name: string;
    isInt: boolean;
    unit?: string;
    minValue?: number;
    maxValue?: number;
}

export type IMetricCreateDto = WithOptionalId<IMetricDb>;

export interface IMetric extends IMetricDb {}
