import { WithOptionalKeys } from 'src/app/types/with-optional-keys';

export interface IRuleCompletionDb {
  id: number;
  ruleId: number;
  periodStart: string;
  met: number; // 0 | 1
}

export type IRuleCompletionCreateDto = WithOptionalKeys<IRuleCompletionDb, 'id'>;
export interface IRuleCompletion extends IRuleCompletionDb {}
