// achievement.service.ts
import { Injectable } from '@angular/core';
import { HookService } from './hook.service';
import { db } from '../db/db';
import { IAchievement, IAchievementCreateDto, IAchievementDb } from '../db/models/achievement';
import { defaultAchievements } from '../db/data/achievement';
import { ActivityService } from './activity.service';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AchievementService {
    private achievementEvent$ = new Subject<IAchievement>();
    private queue: IAchievement[] = [];
    private showing = false;

    constructor(
        private hookService: HookService,
        private activityService: ActivityService,
    ) {
        this.hookService.onEvent().subscribe(
            async (event) => {
                if (event.type === 'achievement.init') {
                    await this.checkAllInit(event);
                } else {
                    await this.checkAll(event);
                }
            }
        );
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
        // await this.clear();
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
        } else
            // new achievements added
            if (achievements.length < defaultAchievements.length) {
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
            await this.checkAchievement('max_mood', event.payload);
        }
        if (event.type === 'activity.updated') {
            await this.checkAchievement('max_mood', event.payload);
            await this.checkAchievement('first_activity_editing');
        }
        if (event.type === 'backup.made') {
            await this.checkAchievement('first_backup_with_password', event.payload);
            await this.checkAchievement('first_backup_without_password', event.payload);
            await this.checkAchievement('10_backups');
            await this.checkAchievement('100_backups');
        }
    }

    async add(achievement: IAchievementCreateDto | IAchievementDb) {
        return db.achievements.add(achievement);
    }

    async bulkAdd(achievements: IAchievementCreateDto[] | IAchievementDb[]) {
        const result = [];

        for (const achievement of achievements) {
            result.push(await this.add(achievement));
        }

        return result;
    }

    async get(id: number) {
        return db.achievements.get(id);
    }

    async getByCode(code: string) {
        return db.achievements
            .where('code')
            .equals(code)
            .first();
    }

    async getUnlocked() {
        return db.achievements
            .filter((achievement) => achievement.unlocked === true)
            .toArray();
    }

    async getAll() {
        return db.achievements.toArray();
    }

    async update(id: number, changes: Partial<IAchievementCreateDto>) {
        return db.achievements.update(id, changes);
    }

    async delete(id: number) {
        return db.achievements.delete(id);
    }

    async clear() {
        await db.achievements.clear();
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

        if (achievementCode == 'max_mood') {
            await this.checkMaxMoodAchievement(payload.activityId);
        }
        if (achievementCode == 'first_activity_editing') {
            await this.checkFirstActivityEditingAchievement();
        }
        if (achievementCode == 'first_backup_with_password') {
            await this.checkFirstBackupWithPasswordAchievement(payload.isPasswordSet);
        }
        if (achievementCode == 'first_backup_without_password') {
            await this.checkFirstBackupWithoutPasswordAchievement(payload.isPasswordSet);
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
                const activities = await this.activityService.getAllMaxMood();
                return activities?.length > 0;
            },
            null,
        );
    }

    async checkMaxMoodAchievement(activityId: number) {
        await this.checkOneTimeAchievement<number>(
            'max_mood',
            async (activityId) => {
                const activity = await this.activityService.get(activityId!);
                return activity?.mood === 10;
            },
            activityId,
        );
    }

    async checkFirstActivityEditingAchievement() {
        await this.checkOneTimeAchievement('first_activity_editing');
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
