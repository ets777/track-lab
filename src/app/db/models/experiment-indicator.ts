import { WithOptionalKeys } from "src/app/types/with-optional-keys";
import { ExperimentDirection } from "./experiment-metric";

export interface IExperimentIndicatorDb {
  id: number;
  experimentId: number;
  subjectType: string;
  subjectId: number;
  direction: ExperimentDirection;
}

export type IExperimentIndicatorCreateDto = WithOptionalKeys<IExperimentIndicatorDb, 'id'>;

export interface IExperimentIndicator extends IExperimentIndicatorDb {}
