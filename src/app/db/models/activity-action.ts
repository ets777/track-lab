export interface IActivityActionDb {
    id: number;
    activityId: number;
    actionId: number;
}

export interface IActivityAction extends IActivityActionDb {}

export interface IActivityActionCreateDto {
    activityId: number;
    actionId: number;
}
