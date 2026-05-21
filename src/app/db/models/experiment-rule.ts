import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IExperimentRuleDb {
  id: number;
  experimentId: number;
  ruleId: number;
}

export type IExperimentRuleCreateDto = WithOptionalKeys<IExperimentRuleDb, 'id'>;

export interface IExperimentRule extends IExperimentRuleDb {}
