import { IAchievementCreateDto, IAchievementDb } from "src/app/db/models/achievement";
import { IActionCreateDto, IActionDb } from "src/app/db/models/action";
import { IActionTagCreateDto, IActionTagDb } from "src/app/db/models/action-tag";
import { IActivityCreateDto, IActivityDb } from "src/app/db/models/activity";
import { IActivityActionCreateDto, IActivityActionDb } from "src/app/db/models/activity-action";
import { IActivityTagCreateDto, IActivityTagDb } from "src/app/db/models/activity-tag";
import { ITagCreateDto, ITagDb } from "src/app/db/models/tag";

export interface ITable {
    actions: IActionDb;
    tags: ITagDb;
    achievements: IAchievementDb;
    activities: IActivityDb;
    activityTags: IActivityTagDb;
    activityActions: IActivityActionDb;
    actionTags: IActionTagDb;
}

export interface ICreateDto {
    actions: IActionCreateDto | IActionDb;
    tags: ITagCreateDto | ITagDb;
    achievements: IAchievementCreateDto | IAchievementDb;
    activities: IActivityCreateDto | IActivityDb;
    activityTags: IActivityTagCreateDto | IActivityTagDb;
    activityActions: IActivityActionCreateDto | IActivityActionDb;
    actionTags: IActionTagCreateDto | IActionTagDb;
}

export type TableName = keyof ITable;
export type CreateDtoFor<K extends TableName> = ICreateDto[K];
export type RowFor<K extends TableName> = ITable[K];