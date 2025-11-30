import { IAchievementCreateDto, IAchievementDb } from "src/app/db/models/achievement";
import { IActionCreateDto, IActionDb } from "src/app/db/models/action";
import { IActionLibraryCreateDto, IActionLibraryDb } from "src/app/db/models/action-library";
import { IActionMetricCreateDto, IActionMetricDb } from "src/app/db/models/action-metric";
import { IActionTagCreateDto, IActionTagDb } from "src/app/db/models/action-tag";
import { IActivityCreateDto, IActivityDb } from "src/app/db/models/activity";
import { IActivityActionCreateDto, IActivityActionDb } from "src/app/db/models/activity-action";
import { IActivityLibraryItemCreateDto, IActivityLibraryItemDb } from "src/app/db/models/activity-library-item";
import { IActivityMetricCreateDto, IActivityMetricDb } from "src/app/db/models/activity-metric";
import { IActivityTagCreateDto, IActivityTagDb } from "src/app/db/models/activity-tag";
import { IDictionaryCreateDto, IDictionaryDb } from "src/app/db/models/library";
import { ILibraryItemCreateDto, ILibraryItemDb } from "src/app/db/models/library-item";
import { IMetricCreateDto, IMetricDb } from "src/app/db/models/metric";
import { IStreakCreateDto, IStreakDb } from "src/app/db/models/streak";
import { ITagCreateDto, ITagDb } from "src/app/db/models/tag";

export interface ITable {
    actions: IActionDb;
    tags: ITagDb;
    achievements: IAchievementDb;
    activities: IActivityDb;
    activityTags: IActivityTagDb;
    activityActions: IActivityActionDb;
    actionTags: IActionTagDb;
    actionLibraries: IActionLibraryDb;
    actionMetrics: IActionMetricDb;
    activityLibraryItems: IActivityLibraryItemDb;
    activityMetrics: IActivityMetricDb;
    libraryItems: ILibraryItemDb;
    libraries: IDictionaryDb;
    metrics: IMetricDb;
    streaks: IStreakDb;
}

export interface ICreateDto {
    actions: IActionCreateDto | IActionDb;
    tags: ITagCreateDto | ITagDb;
    achievements: IAchievementCreateDto | IAchievementDb;
    activities: IActivityCreateDto | IActivityDb;
    activityTags: IActivityTagCreateDto | IActivityTagDb;
    activityActions: IActivityActionCreateDto | IActivityActionDb;
    actionTags: IActionTagCreateDto | IActionTagDb;
    actionLibraries: IActionLibraryDb | IActionLibraryCreateDto;
    actionMetrics: IActionMetricDb | IActionMetricCreateDto;
    activityLibraryItems: IActivityLibraryItemDb | IActivityLibraryItemCreateDto;
    activityMetrics: IActivityMetricDb | IActivityMetricCreateDto;
    libraryItems: ILibraryItemDb | ILibraryItemCreateDto;
    libraries: IDictionaryDb | IDictionaryCreateDto;
    metrics: IMetricDb | IMetricCreateDto;
    streaks: IStreakDb | IStreakCreateDto;
}

export type TableName = keyof ITable;
export type CreateDtoFor<K extends TableName> = ICreateDto[K];
export type RowFor<K extends TableName> = ITable[K];

type Primitive = string | number | boolean | null;
type WhereValue = Primitive | Primitive[] | Where | Where[];

export interface Where {
    [key: string]: WhereValue | undefined;
    AND?: Where[];
    OR?: Where[];
    NOT?: Where;
}