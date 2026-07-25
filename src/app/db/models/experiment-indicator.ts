import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export type ExperimentDirection = 'increasing' | 'decreasing' | 'any';

export interface IExperimentIndicatorDb {
  id: number;
  experimentId: number;
  subjectType: string;
  subjectId: number;
  direction: ExperimentDirection;
}

export type IExperimentIndicatorCreateDto = WithOptionalKeys<IExperimentIndicatorDb, 'id'>;

export interface IExperimentIndicator extends IExperimentIndicatorDb {}
