import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ExperimentResultEntry {
  indicatorType: 'metric' | 'item' | 'action' | 'tag';
  indicatorId: number;
  initialValue: number;
  resultValue: number;
}

export interface IExperimentDb {
  id: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  factEndDate: string | null;
  isSuccess: number | null;
  resultData: string | null;
}

export type IExperimentCreateDto = WithOptionalKeys<IExperimentDb, 'id'>;

export interface IExperiment extends IExperimentDb {}
