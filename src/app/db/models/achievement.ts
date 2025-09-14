import { WithOptionalId } from "src/app/types/with-optional-id";

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

export type IAchievementCreateDto = WithOptionalId<IAchievementDb>;

export interface IAchievement extends IAchievementDb {}