import { Injectable, inject } from '@angular/core';
import { HookService } from './hook.service';
import { IAchievement } from '../db/models/achievement';
import { defaultAchievements } from '../db/data/achievement';
import { ActivityService } from './activity.service';
import { ActivityMetricService } from './activity-metric.service';
import { ActivityActionService } from './activity-action.service';
import { Subject } from 'rxjs';
import { format } from 'date-fns';
import { DatabaseService } from './db/database.service';
import { MetricService } from './metric.service';
import { ListService } from './list.service';
import { ItemService } from './item.service';
import { RuleService } from './rule.service';
import { computeRuleStreak } from '../functions/rule-streak';

@Injectable({ providedIn: 'root' })
export class AchievementService extends DatabaseService<'achievements'> {
  private hookService = inject(HookService);
  private activityService = inject(ActivityService);
  private activityMetricService = inject(ActivityMetricService);
  private activityActionService = inject(ActivityActionService);
  private metricService = inject(MetricService);
  private listService = inject(ListService);
  private itemService = inject(ItemService);
  private ruleService = inject(RuleService);

  protected tableName: 'achievements' = 'achievements';

  private achievementEvent$ = new Subject<IAchievement>();
  private queue: IAchievement[] = [];
  private showing = false;

  isShowing() {
    return this.showing;
  }

  emit(achievement: IAchievement) {
    this.achievementEvent$.next(achievement);
  }

  onEvent() {
    return this.achievementEvent$.asObservable();
  }

  enqueue(achievement: IAchievement) {
    this.queue.push(achievement);
    this.processQueue();
  }

  private processQueue() {
    if (this.showing || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift()!;
    this.showing = true;

    this.achievementEvent$.next(next);

    setTimeout(() => {
      this.showing = false;
      this.processQueue();
    }, 5000);
  }

  async init() {
    this.hookService.onEvent().subscribe(
      async (event) => {
        if (event.type === 'achievement.init') {
          await this.checkAllInit(event);
        } else {
          await this.checkAll(event);
        }
      }
    );

    const achievements = await this.getAll();

    // first launch
    if (achievements.length === 0) {
      await this.bulkAdd(defaultAchievements);
      this.hookService.emit({
        type: 'achievement.init',
        payload: {
          newAchievementCodes: defaultAchievements.map((achievement) => achievement.code),
        },
      });

    }
    // new achievements added
    else if (achievements.length < defaultAchievements.length) {
      const achievementsToAdd = defaultAchievements.filter(
        (defaultAchievement) => !achievements.find(
          (achievement) => achievement.code == defaultAchievement.code,
        ),
      );

      await this.bulkAdd(achievementsToAdd);
      this.hookService.emit({
        type: 'achievement.init',
        payload: {
          newAchievementCodes: achievementsToAdd.map((achievement) => achievement.code),
        },
      });
    }
  }

  private async checkAllInit(event: any) {
    for (const code of event.payload.newAchievementCodes) {
      await this.checkAchievementInit(code);
    }
  }

  private async checkAll(event: any) {
    if (event.type === 'activity.added') {
      await this.checkAchievement('first_activity');
      await this.checkAchievement('10_activities');
      await this.checkAchievement('100_activities');
      await this.checkAchievement('1000_activities');
      await this.checkAchievement('10000_activities');
      await this.checkAchievement('100000_activities');
      await this.checkAchievement('new_year', event.payload);
      await this.checkAchievement('100_action_executions');
      await this.checkAchievement('1000_action_executions');
      await this.checkAchievement('five_actions_in_activity', event.payload);
    }

    if (event.type === 'activity.updated') {
      await this.checkAchievement('first_activity_editing');
      await this.checkAchievement('100_action_executions');
      await this.checkAchievement('1000_action_executions');
      await this.checkAchievement('five_actions_in_activity', event.payload);
    }

    if (['activity.added', 'activity.updated'].includes(event.type)) {
      await this.checkAchievement('max_mood', event.payload);
      await this.checkAchievement('min_mood', event.payload);
      await this.checkAchievement('max_energy', event.payload);
      await this.checkAchievement('min_energy', event.payload);
    }

    if (event.type === 'metric.added') {
      await this.checkAchievement('first_metric');
    }

    if (event.type === 'activity.metricsAdded') {
      await this.checkAchievement('10_metric_records');
      await this.checkAchievement('100_metric_records');
      await this.checkAchievement('1000_metric_records');
      await this.checkAchievement('10000_metric_records');
    }

    if (event.type === 'list.added') {
      await this.checkAchievement('first_list');
      await this.checkAchievement('10_lists');
    }

    if (event.type === 'item.added') {
      await this.checkAchievement('100_items');
      await this.checkAchievement('1000_items');
    }

    if (event.type === 'backup.made') {
      await this.checkAchievement('first_backup_with_password', event.payload);
      await this.checkAchievement('first_backup_without_password', event.payload);
      await this.checkAchievement('10_backups');
      await this.checkAchievement('100_backups');
    }

    if (event.type === 'homepage.visited') {
      await this.checkAchievement('homepage_visited');
    }

    if (event.type === 'rule.added') {
      await this.checkAchievement('first_rule');
      await this.checkAchievement('10_rules');
      await this.checkAchievement('first_prohibiting_rule', event.payload);
    }

    if (['activity.added', 'activity.updated'].includes(event.type)) {
      await this.checkAchievement('rule_streak_10');
      await this.checkAchievement('rule_streak_100');
    }
  }

  async getByCode(code: string) {
    return this.getFirstWhereEquals('code', code);
  }

  async getUnlocked() {
    const all = await this.getAll();
    return all.filter((achievement) => achievement.unlocked);
  }

  async checkAchievement(achievementCode: string, payload?: any) {
    const countAchievements = [
      'first_activity',
      '10_activities',
      '100_activities',
      '1000_activities',
      '10000_activities',
      '100000_activities',
      '10_backups',
      '100_backups',
    ];

    if (countAchievements.includes(achievementCode)) {
      await this.checkCountAchievement(achievementCode);
    }

    const conditionlessAchievements = [
      'first_activity_editing',
      'homepage_visited',
    ];

    if (conditionlessAchievements.includes(achievementCode)) {
      await this.checkOneTimeAchievement(achievementCode)
    }

    if (achievementCode == 'max_mood') {
      await this.checkMaxMoodAchievement(payload.activityId);
    }

    if (achievementCode == 'min_mood') {
      await this.checkMinMoodAchievement(payload.activityId);
    }

    if (achievementCode == 'max_energy') {
      await this.checkMaxEnergyAchievement(payload.activityId);
    }

    if (achievementCode == 'min_energy') {
      await this.checkMinEnergyAchievement(payload.activityId);
    }

    if (achievementCode == 'first_backup_with_password') {
      await this.checkFirstBackupWithPasswordAchievement(payload.isPasswordSet);
    }

    if (achievementCode == 'first_backup_without_password') {
      await this.checkFirstBackupWithoutPasswordAchievement(payload.isPasswordSet);
    }

    if (achievementCode == 'new_year') {
      await this.checkNewYearAchievement(payload.activityId);
    }

    if (achievementCode == 'first_metric') {
      await this.checkFirstMetricAchievement();
    }

    const metricRecordAchievements = [
      '10_metric_records',
      '100_metric_records',
      '1000_metric_records',
      '10000_metric_records',
    ];
    if (metricRecordAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievement(achievementCode, await this.activityMetricService.count());
    }

    const actionExecutionAchievements = ['100_action_executions', '1000_action_executions'];
    if (actionExecutionAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievement(achievementCode, await this.activityActionService.count());
    }

    if (achievementCode == 'five_actions_in_activity') {
      await this.checkFiveActionsInActivityAchievement(payload?.activityId);
    }

    const listCountAchievements = ['first_list', '10_lists'];
    if (listCountAchievements.includes(achievementCode)) {
      const lists = await this.listService.getAll();
      await this.checkAbsoluteCountAchievement(achievementCode, lists.filter(l => !l.isBase).length);
    }

    const itemCountAchievements = ['100_items', '1000_items'];
    if (itemCountAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievement(achievementCode, await this.itemService.count());
    }

    const ruleCountAchievements = ['first_rule', '10_rules'];
    if (ruleCountAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievement(achievementCode, await this.ruleService.count());
    }

    if (achievementCode === 'first_prohibiting_rule') {
      await this.checkFirstProhibitingRuleAchievement(payload?.ruleId);
    }

    if (achievementCode === 'rule_streak_10') {
      await this.checkRuleStreakAchievement('rule_streak_10', 10);
    }

    if (achievementCode === 'rule_streak_100') {
      await this.checkRuleStreakAchievement('rule_streak_100', 100);
    }
  }

  async checkAchievementInit(achievementCode: string) {
    const activityAchievements = [
      'first_activity',
      '10_activities',
      '100_activities',
      '1000_activities',
      '10000_activities',
      '100000_activities',
    ];

    if (activityAchievements.includes(achievementCode)) {
      await this.checkActivityAchievementInit(achievementCode);
    }

    const metricRecordAchievements = [
      '10_metric_records',
      '100_metric_records',
      '1000_metric_records',
      '10000_metric_records',
    ];
    if (metricRecordAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievementInit(achievementCode, await this.activityMetricService.count());
    }

    if (achievementCode == 'first_metric') {
      await this.checkFirstMetricAchievementInit();
    }

    const actionExecutionAchievements = ['100_action_executions', '1000_action_executions'];
    if (actionExecutionAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievementInit(achievementCode, await this.activityActionService.count());
    }

    if (achievementCode == 'five_actions_in_activity') {
      await this.checkFiveActionsInActivityAchievementInit();
    }

    const listCountAchievements = ['first_list', '10_lists'];
    if (listCountAchievements.includes(achievementCode)) {
      const lists = await this.listService.getAll();
      await this.checkAbsoluteCountAchievementInit(achievementCode, lists.filter(l => !l.isBase).length);
    }

    const itemCountAchievements = ['100_items', '1000_items'];
    if (itemCountAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievementInit(achievementCode, await this.itemService.count());
    }

    if (achievementCode == 'max_mood') {
      await this.checkMaxMoodAchievementInit();
    }

    if (achievementCode == 'min_mood') {
      await this.checkMinMoodAchievementInit();
    }

    if (achievementCode == 'max_energy') {
      await this.checkMaxEnergyAchievementInit();
    }

    if (achievementCode == 'min_energy') {
      await this.checkMinEnergyAchievementInit();
    }

    const ruleCountAchievements = ['first_rule', '10_rules'];
    if (ruleCountAchievements.includes(achievementCode)) {
      await this.checkAbsoluteCountAchievementInit(achievementCode, await this.ruleService.count());
    }

    if (achievementCode === 'first_prohibiting_rule') {
      await this.checkFirstProhibitingRuleAchievementInit();
    }

    if (achievementCode === 'rule_streak_10') {
      await this.checkRuleStreakAchievement('rule_streak_10', 10);
    }

    if (achievementCode === 'rule_streak_100') {
      await this.checkRuleStreakAchievement('rule_streak_100', 100);
    }
  }

  async checkActivityAchievementInit(code: string) {
    const achievement = await this.getByCode(code);

    if (!achievement || achievement.unlocked) {
      return;
    }

    const activityCount = await this.activityService.count();

    if (activityCount >= achievement.target) {
      this.update(achievement.id, { unlocked: true, current: achievement.target });
      this.enqueue(achievement);
    } else {
      this.update(achievement.id, { current: activityCount });
    }
  }

  async checkCountAchievement(code: string) {
    const achievement = await this.getByCode(code);

    if (!achievement || achievement.unlocked) {
      return;
    }

    if (achievement.current >= achievement.target - 1) {
      this.update(achievement.id, { unlocked: true, current: achievement.target });
      this.enqueue(achievement);
    } else {
      this.update(achievement.id, { current: achievement.current + 1 });
    }
  }

  async checkOneTimeAchievement<T>(
    code: string,
    callback?: (payload?: T) => Promise<boolean>,
    payload?: T,
  ) {
    const achievement = await this.getByCode(code);

    if (!achievement || achievement.unlocked) {
      return;
    }

    if (!callback || await callback(payload)) {
      this.update(achievement.id, { unlocked: true, current: achievement.target });
      this.enqueue(achievement);
    }
  }

  async checkMaxMoodAchievementInit() {
    const metric = await this.metricService.getFirstWhereEquals('name', 'TK_MOOD');
    if (!metric) return;
    await this.checkOneTimeAchievement(
      'max_mood',
      async () => {
        const records = await this.activityMetricService.getByMetricIdInValueRange(metric.id, [9, 10]);
        return records.length > 0;
      },
      null,
    );
  }

  async checkMinMoodAchievementInit() {
    const metric = await this.metricService.getFirstWhereEquals('name', 'TK_MOOD');
    if (!metric) return;
    await this.checkOneTimeAchievement(
      'min_mood',
      async () => {
        const records = await this.activityMetricService.getByMetricIdInValueRange(metric.id, [1, 2]);
        return records.length > 0;
      },
      null,
    );
  }

  async checkMaxEnergyAchievementInit() {
    const metric = await this.metricService.getFirstWhereEquals('name', 'TK_ENERGY');
    if (!metric) return;
    await this.checkOneTimeAchievement(
      'max_energy',
      async () => {
        const records = await this.activityMetricService.getByMetricIdInValueRange(metric.id, [9, 10]);
        return records.length > 0;
      },
      null,
    );
  }

  async checkMinEnergyAchievementInit() {
    const metric = await this.metricService.getFirstWhereEquals('name', 'TK_ENERGY');
    if (!metric) return;
    await this.checkOneTimeAchievement(
      'min_energy',
      async () => {
        const records = await this.activityMetricService.getByMetricIdInValueRange(metric.id, [1, 2]);
        return records.length > 0;
      },
      null,
    );
  }

  async checkNewYearAchievement(activityId: number) {
    await this.checkOneTimeAchievement(
      'new_year',
      async (activityId) => {
        const activity = await this.activityService.getById(activityId!);
        return activity?.date.slice(5) === '01-01'
          && format(new Date(), 'MM-dd') === '01-01';
      },
      activityId,
    );
  }

  async checkMaxMoodAchievement(activityId: number) {
    await this.checkOneTimeAchievement<number>(
      'max_mood',
      async (activityId) => {
        const activity = await this.activityService.getEnriched(activityId!);
        const moodMetric = await this.metricService.getFirstWhereEquals('name', 'TK_MOOD');
        const record = activity?.metricRecords.find((record) => record.metricId == moodMetric?.id);

        return !!(record?.value && record.value >= 9);
      },
      activityId,
    );
  }

  async checkMinMoodAchievement(activityId: number) {
    await this.checkOneTimeAchievement<number>(
      'min_mood',
      async (activityId) => {
        const activity = await this.activityService.getEnriched(activityId!);
        const moodMetric = await this.metricService.getFirstWhereEquals('name', 'TK_MOOD');
        const record = activity?.metricRecords.find((record) => record.metricId == moodMetric?.id);

        return !!(record?.value && record.value <= 2);
      },
      activityId,
    );
  }

  async checkMinEnergyAchievement(activityId: number) {
    await this.checkOneTimeAchievement<number>(
      'min_energy',
      async (activityId) => {
        const activity = await this.activityService.getEnriched(activityId!);
        const moodMetric = await this.metricService.getFirstWhereEquals('name', 'TK_ENERGY');
        const record = activity?.metricRecords.find((record) => record.metricId == moodMetric?.id);

        return !!(record?.value && record.value <= 2);
      },
      activityId,
    );
  }

  async checkMaxEnergyAchievement(activityId: number) {
    await this.checkOneTimeAchievement<number>(
      'max_energy',
      async (activityId) => {
        const activity = await this.activityService.getEnriched(activityId!);
        const moodMetric = await this.metricService.getFirstWhereEquals('name', 'TK_ENERGY');
        const record = activity?.metricRecords.find((record) => record.metricId == moodMetric?.id);

        return !!(record?.value && record.value >= 9);
      },
      activityId,
    );
  }

  async checkFirstBackupWithPasswordAchievement(isPasswordSet: boolean) {
    await this.checkOneTimeAchievement<boolean>(
      'first_backup_with_password',
      async (isPasswordSet) => isPasswordSet!,
      isPasswordSet,
    );
  }

  async checkFirstBackupWithoutPasswordAchievement(isPasswordSet: boolean) {
    await this.checkOneTimeAchievement<boolean>(
      'first_backup_without_password',
      async (isPasswordSet) => !isPasswordSet,
      isPasswordSet,
    );
  }

  async checkFirstMetricAchievement() {
    await this.checkOneTimeAchievement(
      'first_metric',
      async () => {
        const metrics = await this.metricService.getAll();
        return metrics.some((m) => !m.isBase);
      },
    );
  }

  async checkFirstMetricAchievementInit() {
    await this.checkOneTimeAchievement(
      'first_metric',
      async () => {
        const metrics = await this.metricService.getAll();
        return metrics.some((m) => !m.isBase);
      },
    );
  }

  async checkAbsoluteCountAchievement(code: string, count: number) {
    const achievement = await this.getByCode(code);
    if (!achievement || achievement.unlocked) return;
    if (count >= achievement.target) {
      this.update(achievement.id, { unlocked: true, current: achievement.target });
      this.enqueue(achievement);
    } else {
      this.update(achievement.id, { current: count });
    }
  }

  async checkAbsoluteCountAchievementInit(code: string, count: number) {
    return this.checkAbsoluteCountAchievement(code, count);
  }

  async checkFiveActionsInActivityAchievement(activityId?: number) {
    if (!activityId) return;
    await this.checkOneTimeAchievement(
      'five_actions_in_activity',
      async () => {
        const actions = await this.activityActionService.getByActivityId(activityId);
        return actions.length >= 5;
      },
    );
  }

  async checkFiveActionsInActivityAchievementInit() {
    const all = await this.activityActionService.getAll();
    const countByActivity = new Map<number, number>();
    for (const aa of all) {
      countByActivity.set(aa.activityId, (countByActivity.get(aa.activityId) ?? 0) + 1);
    }
    const hasActivity = [...countByActivity.values()].some(c => c >= 5);
    if (hasActivity) {
      await this.checkOneTimeAchievement('five_actions_in_activity', async () => true);
    }
  }

  async checkFirstProhibitingRuleAchievement(ruleId?: number) {
    if (!ruleId) return;
    await this.checkOneTimeAchievement(
      'first_prohibiting_rule',
      async (id) => {
        const rule = await this.ruleService.getById(id!);
        return rule?.value === 0;
      },
      ruleId,
    );
  }

  async checkFirstProhibitingRuleAchievementInit() {
    await this.checkOneTimeAchievement(
      'first_prohibiting_rule',
      async () => {
        const rules = await this.ruleService.getAll();
        return rules.some(r => r.value === 0);
      },
    );
  }

  async checkRuleStreakAchievement(code: string, threshold: number) {
    await this.checkOneTimeAchievement(
      code,
      async () => {
        const rules = await this.ruleService.getAll();
        if (!rules.length) return false;
        const activities = await this.activityService.getAllEnriched();
        return rules.some(rule => computeRuleStreak(rule, activities) >= threshold);
      },
    );
  }
}
