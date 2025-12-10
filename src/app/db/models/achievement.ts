import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IAchievementDb {
  id: number;
  icon?: string;
  code: string;
  title: string;
  target: number;
  current: number;
  unlocked: boolean;
  description?: string;
  data?: string;
}

export type IAchievementCreateDto = WithOptionalKeys<IAchievementDb, 'id'>;

export interface IAchievement extends IAchievementDb { }