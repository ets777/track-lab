import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export type RuleSubjectType = 'action' | 'tag' | 'item';
export type RuleMetric = 'count' | 'totalDuration' | 'countDays';
export type RuleOperator = '>=' | '<=';
export type RulePeriod = 'day' | 'week' | 'month';

export interface IRuleDb {
  id: number;
  subjectType: RuleSubjectType;
  subjectId: number;
  metric: RuleMetric;
  operator: RuleOperator;
  value: number;
  period: RulePeriod;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
}

export type IRuleCreateDto = WithOptionalKeys<IRuleDb, 'id'>;

export interface IRule extends IRuleDb {}
