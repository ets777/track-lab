import { Injectable } from '@angular/core';
import { ActivityService } from './activity.service';
import { ActionService } from './action.service';
import { ActivityActionService } from './activity-action.service';
import { decode, encode } from '../functions/crypto';
import { format } from 'date-fns';
import { appVersion } from '../../environments/version';
import { AlertController } from '@ionic/angular';
import { IActivityDb } from '../db/models/activity';
import { IActionDb } from '../db/models/action';
import { IActivityActionDb } from '../db/models/activity-action';
import { InterpolationParameters, TranslateService } from '@ngx-translate/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { IAchievementDb } from '../db/models/achievement';
import { AchievementService } from './achievement.service';
import { HookService } from './hook.service';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { autoBackupOption } from '../pages/settings/settings.page';
import { Preferences } from '@capacitor/preferences';
import { ToastService } from './toast.service';

type Backup = {
    activities: IActivityDb[],
    actions: IActionDb[],
    activityActions: IActivityActionDb[],
    achievements: IAchievementDb[],
    version: string,
};

@Injectable({ providedIn: 'root' })
export class DatabaseService {
    defaultPassword = 'etsbox.com';

    constructor(
        private activityService: ActivityService,
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
        private achievementService: AchievementService,
        private alertController: AlertController,
        private translate: TranslateService,
        private hookService: HookService,
        private toastService: ToastService,
    ) { }

    async backup() {
        this.toastService.enqueue({
            title: 'TK_STARTING_BACKUP_PROCESS',
            type: 'waiting',
        });

        const all: Backup = {
            activities: await this.activityService.getAll(),
            actions: await this.actionService.getAll(),
            activityActions: await this.activityActionService.getAll(),
            achievements: await this.achievementService.getAll(),
            version: appVersion,
        };

        const password = await this.getPassword();

        if (!password) {
            return;
        }

        const content = encode(all, password);
        const currentDate = format(new Date(), 'yyyy-MM-dd');

        if (Capacitor.isNativePlatform()) {
            const dirPath = 'TrackLab/backups';

            await Filesystem.mkdir({
                path: dirPath,
                directory: Directory.Documents,
                recursive: true,
            }).catch(() => {
                // ignore if already exists
            });

            const fullPath = `${dirPath}/${currentDate}.txt`;

            await Filesystem.writeFile({
                path: fullPath,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });

            await this.showMessage(
                'TK_FILE_SAVED_IN_PATH', 
                { path: 'Documents/' + fullPath },
            );
        } else {
            const blob = new Blob([content], { type: 'text/plain' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'backup_' + currentDate + '.txt';
            a.click();

            URL.revokeObjectURL(url);
        }

        await Preferences.set({
            key: 'last-backup-date',
            value: format(new Date(), 'yyyy-MM-dd'),
        });

        this.toastService.enqueue({
            title: 'TK_BACKUP_PROCESS_FINISHED_SUCCESSFULLY',
            type: 'success',
        });

        this.hookService.emit({ 
            type: 'backup.made', 
            payload: { isPasswordSet: password !== this.defaultPassword },
        });
        
    }

    async restore(content: string) {
        // first try with default password
        try {
            const decodedWithDefaultPassword = decode(content, this.defaultPassword);
    
            if (decodedWithDefaultPassword) {
                await this.fillDatabase(decodedWithDefaultPassword);
                return;
            }
        } catch(e) {
            // do nothing
        }

        const password = await this.askPasswordToRestore();

        if (password) {
            try {
                await this.fillDatabase(decode(content, password));
            } catch(e) {
                await this.showMessage('TK_WRONG_PASSWORD');
            }
        }
    }

    async fillDatabase(backup: Backup) {
        const confirmation = await this.askDatabaseToReset();

        if (!confirmation) {
            return;
        }

        await this.clearDatabase();

        await this.activityActionService.bulkAdd(backup.activityActions);
        await this.actionService.bulkAdd(backup.actions);
        await this.activityService.bulkAdd(backup.activities);
        await this.achievementService.bulkAdd(backup.achievements);

        await this.showMessage('TK_DATABASE_HAS_BEEN_RESTORED_SUCCESSFULLY');
    }

    async clearDatabase() {
        await this.activityActionService.clear();
        await this.actionService.clear();
        await this.activityService.clear();
        await this.achievementService.clear();
    }

    async askPasswordToRestore(): Promise<string | null> {
        const alert = await this.alertController.create({
            header: this.translate.instant('TK_ENTER_PASSWORD'),
            inputs: [
                {
                    name: 'password',
                    type: 'password',
                    placeholder: this.translate.instant('TK_PASSWORD'),
                },
            ],
            buttons: [
                { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
                { text: this.translate.instant('TK_OK'), role: 'ok' },
            ],
        });

        await alert.present();

        const { data, role } = await alert.onDidDismiss();

        if (data?.values.password && role === 'ok') {
            return data.values.password;
        } else {
            return null;
        }
    }

    async askPasswordToSet(initialSet: boolean): Promise<string | null> {
        const noPasswordButtonTitle = initialSet
            ? 'TK_DON_T_SET'
            : 'TK_RESET';
        const noPasswordToastMessage = initialSet
            ? 'TK_EMPTY_PASSWORD_WAS_SET'
            : 'TK_PASSWORD_WAS_RESET_SUCCESSFULLY';
        const alert = await this.alertController.create({
            header: this.translate.instant('TK_SET_PASSWORD'),
            inputs: [
                {
                    name: 'password',
                    type: 'password',
                    placeholder: this.translate.instant('TK_PASSWORD'),
                },
            ],
            buttons: [
                { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
                { text: this.translate.instant(noPasswordButtonTitle), role: 'no-password' },
                { text: this.translate.instant('TK_OK'), role: 'ok' },
            ],
        });

        await alert.present();

        const { data, role } = await alert.onDidDismiss();

        if (data?.values.password && role === 'ok') {
            await this.setPassword(data.values.password);
            this.toastService.enqueue({
                title: 'TK_PASSWORD_WAS_SET_SUCCESSFULLY',
                type: 'success',
            });
            return data.values.password;
        } else if (
            role === 'no-password' 
            || !data?.values.password && role === 'ok'
        ) {
            await this.setPassword(this.defaultPassword);
            this.toastService.enqueue({
                title: noPasswordToastMessage,
                type: 'success',
            });
            return this.defaultPassword;
        } else {
            return null;
        }
    }

    async showMessage(message: string, params?: InterpolationParameters) {
        const alert = await this.alertController.create({
            header: this.translate.instant(message, params),
            buttons: [
                { text: this.translate.instant('TK_CLOSE'), role: 'close' },
            ],
        });

        await alert.present();
    }

    async askDatabaseToReset(): Promise<boolean> {
        const alert = await this.alertController.create({
            header: this.translate.instant('TK_CONFIRMATION'),
            subHeader: this.translate.instant('TK_BEFORE_RESTORING_ALL_YOUR_CURRENT_DATA_WILL_BE_ERASED_DO_YOU_WANT_TO_CONTINUE'),
            buttons: [
                { text: this.translate.instant('TK_YES'), role: 'yes' },
                { text: this.translate.instant('TK_NO'), role: 'no' },
            ],
        });

        await alert.present();

        const { role } = await alert.onDidDismiss();

        return role === 'yes';
    }

    async getPassword() {
        let password: string = (await SecureStoragePlugin.get({ key: 'backup-password' }).catch(() => null))?.value ?? '';

        if (!password) {
            password = await this.askPasswordToSet(true) ?? '';
        }

        return password;
    }

    async setPassword(password: string) {
        await SecureStoragePlugin.set({ key: 'backup-password', value: password });
    }

    async setAutobackupPeriod(value?: autoBackupOption) {
        if (value == autoBackupOption.none) {
            await Preferences.set({ key: 'auto-backup-period', value });
            return value;
        }

        const password = await this.getPassword();

        if (password && value) {
            await Preferences.set({ key: 'auto-backup-period', value });
            return value;
        } else {
            // user cancelled password setting
            return (await Preferences.get({ key: 'auto-backup-period' }))?.value as autoBackupOption;
        }

    }
}