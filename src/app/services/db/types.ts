import { IAchievementCreateDto, IAchievementDb } from "src/app/db/models/achievement";
import { IActionCreateDto, IActionDb } from "src/app/db/models/action";
import { IActionDictionaryCreateDto, IActionDictionaryDb } from "src/app/db/models/action-dictionary";
import { IActionMetricCreateDto, IActionMetricDb } from "src/app/db/models/action-metric";
import { IActionTagCreateDto, IActionTagDb } from "src/app/db/models/action-tag";
import { IActivityCreateDto, IActivityDb } from "src/app/db/models/activity";
import { IActivityActionCreateDto, IActivityActionDb } from "src/app/db/models/activity-action";
import { IActivityTermCreateDto, IActivityTermDb } from "src/app/db/models/activity-term";
import { IActivityMetricCreateDto, IActivityMetricDb } from "src/app/db/models/activity-metric";
import { IActivityTagCreateDto, IActivityTagDb } from "src/app/db/models/activity-tag";
import { IDictionaryCreateDto, IDictionaryDb } from "src/app/db/models/dictionary";
import { ITermCreateDto, ITermDb } from "src/app/db/models/term";
import { IMetricCreateDto, IMetricDb } from "src/app/db/models/metric";
import { IStreakCreateDto, IStreakDb } from "src/app/db/models/streak";
import { ITagCreateDto, ITagDb } from "src/app/db/models/tag";
import { ITagMetricCreateDto, ITagMetricDb } from "src/app/db/models/tag-metric";

export interface ITable {
    actions: IActionDb;
    tags: ITagDb;
    achievements: IAchievementDb;
    activities: IActivityDb;
    activityTags: IActivityTagDb;
    activityActions: IActivityActionDb;
    actionTags: IActionTagDb;
    actionDictionaries: IActionDictionaryDb;
    actionMetrics: IActionMetricDb;
    activityTerms: IActivityTermDb;
    activityMetrics: IActivityMetricDb;
    terms: ITermDb;
    dictionaries: IDictionaryDb;
    metrics: IMetricDb;
    streaks: IStreakDb;
    tagMetrics: ITagMetricDb;
}

export interface ICreateDto {
    actions: IActionCreateDto | IActionDb;
    tags: ITagCreateDto | ITagDb;
    achievements: IAchievementCreateDto | IAchievementDb;
    activities: IActivityCreateDto | IActivityDb;
    activityTags: IActivityTagCreateDto | IActivityTagDb;
    activityActions: IActivityActionCreateDto | IActivityActionDb;
    actionTags: IActionTagCreateDto | IActionTagDb;
    actionDictionaries: IActionDictionaryDb | IActionDictionaryCreateDto;
    actionMetrics: IActionMetricDb | IActionMetricCreateDto;
    activityTerms: IActivityTermDb | IActivityTermCreateDto;
    activityMetrics: IActivityMetricDb | IActivityMetricCreateDto;
    terms: ITermDb | ITermCreateDto;
    dictionaries: IDictionaryDb | IDictionaryCreateDto;
    metrics: IMetricDb | IMetricCreateDto;
    streaks: IStreakDb | IStreakCreateDto;
    tagMetrics: ITagMetricDb | ITagMetricCreateDto;
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