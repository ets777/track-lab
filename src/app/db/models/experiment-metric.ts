import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export type ExperimentDirection = 'increasing' | 'decreasing' | 'any';

export interface IExperimentMetricDb {
  id: number;
  experimentId: number;
  metricId: number;
  direction: ExperimentDirection;
}

export type IExperimentMetricCreateDto = WithOptionalKeys<IExperimentMetricDb, 'id'>;

export interface IExperimentMetric extends IExperimentMetricDb {}
