import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IMetricDb {
    id: number;
    name: string;
    isHidden: boolean;
    isBase?: boolean;
    unit?: string;
    step: number;
    minValue?: number;
    maxValue?: number;
    showPreviousValue?: boolean;
}

export type IMetricCreateDto = WithOptionalKeys<IMetricDb, 'id'>;

export interface IMetric extends IMetricDb {}
