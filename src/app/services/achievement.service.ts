import { Injectable } from '@angular/core';
import { HookService } from './hook.service';
import { IAchievement } from '../db/models/achievement';
import { defaultAchievements } from '../db/data/achievement';
import { ActivityService } from './activity.service';
import { Subject } from 'rxjs';
import { format } from 'date-fns';
import { DatabaseService } from './db/database.service';
import { DatabaseRouter } from './db/database-router.service';
import { MetricService } from './metric.service';

@Injectable({ providedIn: 'root' })
export class AchievementService extends DatabaseService<'achievements'> {
    protected tableName: 'achievements' = 'achievements';

    private achievementEvent$ = new Subject<IAchievement>();
    private queue: IAchievement[] = [];
    private showing = false;

    constructor(
        private hookService: HookService,
        private activityService: ActivityService,
        private metricService: MetricService,
        adapter: DatabaseRouter,
    ) {
        super(adapter);
    }

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
        }

        if (event.type === 'activity.updated') {
            await this.checkAchievement('first_activity_editing');
        }

        if (['activity.added', 'activity.updated'].includes(event.type)) {
            await this.checkAchievement('max_mood', event.payload);
            await this.checkAchievement('min_mood', event.payload);
            await this.checkAchievement('max_energy', event.payload);
            await this.checkAchievement('min_energy', event.payload);
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
        await this.checkOneTimeAchievement(
            'max_mood',
            async () => {
                const activities = await this.activityService
                    .getAllByRange('mood', [9, 10]);
                return activities?.length > 0;
            },
            null,
        );
    }

    async checkMinMoodAchievementInit() {
        await this.checkOneTimeAchievement(
            'min_mood',
            async () => {
                const activities = await this.activityService
                    .getAllByRange('mood', [1, 2]);
                return activities?.length > 0;
            },
            null,
        );
    }

    async checkMaxEnergyAchievementInit() {
        await this.checkOneTimeAchievement(
            'max_energy',
            async () => {
                const activities = await this.activityService
                    .getAllByRange('energy', [9, 10]);
                return activities?.length > 0;
            },
            null,
        );
    }

    async checkMinEnergyAchievementInit() {
        await this.checkOneTimeAchievement(
            'min_energy',
            async () => {
                const activities = await this.activityService
                    .getAllByRange('energy', [1, 2]);
                return activities?.length > 0;
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
}
