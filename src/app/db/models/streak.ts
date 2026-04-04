import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IStreakDb {
  id: number;
  tagId?: number;
  actionId?: number;
  itemId?: number;
  startDate: string;
  lastDate?: string;
}

export type IStreakCreateDto = WithOptionalKeys<IStreakDb, 'id'>;

export interface IStreak extends IStreakDb { }
