import { IAchievementCreateDto, IAchievementDb } from "src/app/db/models/achievement";
import { IActionCreateDto, IActionDb } from "src/app/db/models/action";
import { IActionListCreateDto, IActionListDb } from "src/app/db/models/action-list";
import { IActionMetricCreateDto, IActionMetricDb } from "src/app/db/models/action-metric";
import { IActionTagCreateDto, IActionTagDb } from "src/app/db/models/action-tag";
import { IActivityCreateDto, IActivityDb } from "src/app/db/models/activity";
import { IActivityActionCreateDto, IActivityActionDb } from "src/app/db/models/activity-action";
import { IActivityItemCreateDto, IActivityItemDb } from "src/app/db/models/activity-item";
import { IActivityMetricCreateDto, IActivityMetricDb } from "src/app/db/models/activity-metric";
import { IActivityTagCreateDto, IActivityTagDb } from "src/app/db/models/activity-tag";
import { IListCreateDto, IListDb } from "src/app/db/models/list";
import { IItemCreateDto, IItemDb } from "src/app/db/models/item";
import { IMetricCreateDto, IMetricDb } from "src/app/db/models/metric";
import { IStreakCreateDto, IStreakDb } from "src/app/db/models/streak";
import { ITagCreateDto, ITagDb } from "src/app/db/models/tag";
import { ITagMetricCreateDto, ITagMetricDb } from "src/app/db/models/tag-metric";
import { IItemMetricCreateDto, IItemMetricDb } from "src/app/db/models/item-metric";
import { IRuleCreateDto, IRuleDb } from "src/app/db/models/rule";

export interface ITable {
    actions: IActionDb;
    tags: ITagDb;
    achievements: IAchievementDb;
    activities: IActivityDb;
    activityTags: IActivityTagDb;
    activityActions: IActivityActionDb;
    actionTags: IActionTagDb;
    actionLists: IActionListDb;
    actionMetrics: IActionMetricDb;
    activityItems: IActivityItemDb;
    activityMetrics: IActivityMetricDb;
    items: IItemDb;
    lists: IListDb;
    metrics: IMetricDb;
    streaks: IStreakDb;
    tagMetrics: ITagMetricDb;
    itemMetrics: IItemMetricDb;
    rules: IRuleDb;
}

export interface ICreateDto {
    actions: IActionCreateDto | IActionDb;
    tags: ITagCreateDto | ITagDb;
    achievements: IAchievementCreateDto | IAchievementDb;
    activities: IActivityCreateDto | IActivityDb;
    activityTags: IActivityTagCreateDto | IActivityTagDb;
    activityActions: IActivityActionCreateDto | IActivityActionDb;
    actionTags: IActionTagCreateDto | IActionTagDb;
    actionLists: IActionListDb | IActionListCreateDto;
    actionMetrics: IActionMetricDb | IActionMetricCreateDto;
    activityItems: IActivityItemDb | IActivityItemCreateDto;
    activityMetrics: IActivityMetricDb | IActivityMetricCreateDto;
    items: IItemDb | IItemCreateDto;
    lists: IListDb | IListCreateDto;
    metrics: IMetricDb | IMetricCreateDto;
    streaks: IStreakDb | IStreakCreateDto;
    tagMetrics: ITagMetricDb | ITagMetricCreateDto;
    itemMetrics: IItemMetricDb | IItemMetricCreateDto;
    rules: IRuleDb | IRuleCreateDto;
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
