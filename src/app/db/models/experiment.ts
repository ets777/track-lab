import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ExperimentResultEntry {
  indicatorType: 'metric' | 'item' | 'action' | 'tag';
  indicatorId: number;
  initialValue: number | null;
  resultValue: number | null;
}

export enum ExperimentFailReason {
  LowUptime = 1,
  InitialValuesNotLogged = 2,
  TrendNotMet = 3,
  FinalValuesNotLogged = 4,
}

export const EXPERIMENT_FAIL_REASON_KEYS: Record<ExperimentFailReason, string> = {
  [ExperimentFailReason.LowUptime]: 'TK_EXPERIMENT_FAIL_REASON_LOW_UPTIME',
  [ExperimentFailReason.InitialValuesNotLogged]: 'TK_EXPERIMENT_FAIL_REASON_INITIAL_VALUES_NOT_LOGGED',
  [ExperimentFailReason.TrendNotMet]: 'TK_EXPERIMENT_FAIL_REASON_TREND_NOT_MET',
  [ExperimentFailReason.FinalValuesNotLogged]: 'TK_EXPERIMENT_FAIL_REASON_FINAL_VALUES_NOT_LOGGED',
};

export interface IExperimentDb {
  id: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  factEndDate: string | null;
  isSuccess: number | null;
  failReasonId: number | null;
  resultData: string | null;
}

export type IExperimentCreateDto = WithOptionalKeys<IExperimentDb, 'id'>;

export interface IExperiment extends IExperimentDb {}
