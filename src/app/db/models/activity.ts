import { IAction } from "./action";

export interface IActivityDb {
    id: number;
    date: string;
    startTime: string;
    endTime?: string;
    mood?: number;
    energy?: number;
    satiety?: number;
    emotions?: string;
    comment?: string;
}

export type IActivityCreateDto = Omit<IActivityDb, 'id'>;

export interface IActivity extends IActivityDb {
    actions: IAction[];
}
