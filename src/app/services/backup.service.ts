import { Injectable, inject } from '@angular/core';
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
import { IAchievementDb } from '../db/models/achievement';
import { AchievementService } from './achievement.service';
import { HookService } from './hook.service';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { autoBackupOption } from '../pages/settings/settings.page';
import { Preferences } from '@capacitor/preferences';
import { ToastService } from './toast.service';
import { ITagDb } from '../db/models/tag';
import { IActionTagDb } from '../db/models/action-tag';
import { IActivityTagDb } from '../db/models/activity-tag';
import { TagService } from './tag.service';
import { ActionTagService } from './action-tag.service';
import { ActivityTagService } from './activity-tag.service';
import { FileService } from './file.service';
import { IActionLibraryDb } from '../db/models/action-library';
import { IActionMetricDb } from '../db/models/action-metric';
import { IActivityLibraryItemDb } from '../db/models/activity-library-item';
import { IActivityMetricDb } from '../db/models/activity-metric';
import { ILibraryItemDb } from '../db/models/library-item';
import { ILibraryDb } from '../db/models/library';
import { IMetricDb } from '../db/models/metric';
import { IStreakDb } from '../db/models/streak';
import { ActionLibraryService } from './action-library.service';
import { ActionMetricService } from './action-metric.service';
import { ActivityLibraryItemService } from './activity-library-item.service';
import { ActivityMetricService } from './activity-metric.service';
import { LibraryItemService } from './library-item.service';
import { LibraryService } from './library.service';
import { MetricService } from './metric.service';
import { StreakService } from './streak.service';
import { getEntitiesFromString } from '../functions/string';

type Backup = {
  activities: IActivityDb[],
  actions: IActionDb[],
  activityActions: IActivityActionDb[],
  achievements: IAchievementDb[],
  tags: ITagDb[],
  actionTags: IActionTagDb[],
  activityTags: IActivityTagDb[],
  actionLibraries: IActionLibraryDb[],
  actionMetrics: IActionMetricDb[],
  activityLibraryItems: IActivityLibraryItemDb[],
  activityMetrics: IActivityMetricDb[],
  libraryItems: ILibraryItemDb[],
  libraries: ILibraryDb[],
  metrics: IMetricDb[],
  streaks: IStreakDb[],
  version: string,
};

const uniqueByProperties = (array: any, properties: [string, string]) => {
  const map = new Map();
  for (const o of array) {
    map.set(`${o[properties[0]]}::${o[properties[1]]}`, o);
  }
  return [...map.values()];
}

const helperRevision1 = {
  prepareBackup: (backup: any) => {
    const moodMetricId = 1;
    const energyMetricId = 2;
    const satietyMetricId = 3;
    const emotionLibraryId = 1;

    backup.metrics = [
      {
        id: moodMetricId,
        name: 'TK_MOOD',
        isInt: true,
        minValue: 1,
        maxValue: 10,
        isHidden: false,
        isBase: true,
      },
      {
        id: energyMetricId,
        name: 'TK_ENERGY',
        isInt: true,
        minValue: 1,
        maxValue: 10,
        isHidden: false,
        isBase: true,
      },
      {
        id: 3,
        name: 'TK_SATIETY',
        isInt: true,
        minValue: 1,
        maxValue: 10,
        isHidden: false,
        isBase: true,
      },
    ];

    backup.libraries = [{
      id: emotionLibraryId,
      name: 'emotions',
    }];

    backup.activityMetrics = [];
    backup.libraryItems = [];
    backup.activityLibraryItems = [];

    let libraryItemId = 1;

    for (const activity of backup.activities) {
      if (activity.mood && activity.mood > 0) {
        backup.activityMetrics.push({
          activityId: activity.id,
          metricId: moodMetricId,
          value: activity.mood,
        });
      }

      if (activity.energy && activity.energy > 0) {
        backup.activityMetrics.push({
          activityId: activity.id,
          metricId: energyMetricId,
          value: activity.energy,
        });
      }

      if (activity.satiety && activity.satiety > 0) {
        backup.activityMetrics.push({
          activityId: activity.id,
          metricId: satietyMetricId,
          value: activity.satiety,
        });
      }

      if (activity.emotions && activity.emotions !== '') {
        const emotionNames = [...new Set(getEntitiesFromString(activity.emotions)
          ?.map((emotion) => emotion.name))];

        for (const emotion of emotionNames) {
          let libraryItem = backup.libraryItems.find(
            (item: any) => item.name == emotion,
          );

          if (!libraryItem) {
            backup.libraryItems.push({
              id: libraryItemId,
              name: emotion,
              libraryId: emotionLibraryId,
            });

            backup.activityLibraryItems.push({
              activityId: activity.id,
              libraryItemId: libraryItemId,
            });

            libraryItemId++;
          } else {
            backup.activityLibraryItems.push({
              activityId: activity.id,
              libraryItemId: libraryItem.id,
            });
          }
        }
      }

      delete activity.mood;
      delete activity.energy;
      delete activity.satiety;
      delete activity.emotions;
    }

    backup.activityActions = uniqueByProperties(
      backup.activityActions,
      ['activityId', 'actionId'],
    );

    backup.actions.forEach((obj: any) => {
      Object.keys(obj).forEach(key => {
        if (key == 'tags' || key == 'doNotMeasure') delete obj[key];
      });
    });

    backup.activities.forEach((obj: any) => {
      Object.keys(obj).forEach(key => {
        if (['actions', 'doNotMeasure', 'tags'].includes(key)) delete obj[key];
      });
    });

    backup.actionLibraries = [];
    backup.actionMetrics = [];
    backup.streaks = [];

    return backup;
  },
};

const helperRevision2 = {
  prepareBackup: (backup: any) => {
    return backup;
  },
};

@Injectable({ providedIn: 'root' })
export class BackupService {
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private activityActionService = inject(ActivityActionService);
  private achievementService = inject(AchievementService);
  private alertController = inject(AlertController);
  private translate = inject(TranslateService);
  private hookService = inject(HookService);
  private toastService = inject(ToastService);
  private tagService = inject(TagService);
  private actionTagService = inject(ActionTagService);
  private activityTagService = inject(ActivityTagService);
  private actionLibraryService = inject(ActionLibraryService);
  private actionMetricService = inject(ActionMetricService);
  private activityLibraryItemService = inject(ActivityLibraryItemService);
  private activityMetricService = inject(ActivityMetricService);
  private libraryItemService = inject(LibraryItemService);
  private libraryService = inject(LibraryService);
  private metricService = inject(MetricService);
  private streakService = inject(StreakService);
  private fileService = inject(FileService);

  defaultPassword = 'etsbox.com';

  versionMap = [
    { version: '0.5.0', helper: helperRevision2 },
    { version: '0.0.0', helper: helperRevision1 },
  ];

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
      tags: await this.tagService.getAll(),
      actionTags: await this.actionTagService.getAll(),
      activityTags: await this.activityTagService.getAll(),

      actionLibraries: await this.actionLibraryService.getAll(),
      actionMetrics: await this.actionMetricService.getAll(),
      activityLibraryItems: await this.activityLibraryItemService.getAll(),
      activityMetrics: await this.activityMetricService.getAll(),
      libraryItems: await this.libraryItemService.getAll(),
      libraries: await this.libraryService.getAll(),
      metrics: await this.metricService.getAll(),
      streaks: await this.streakService.getAll(),

      version: appVersion,
    };

    const password = await this.getPassword();

    if (!password) {
      return;
    }

    const content = encode(all, password);
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const dirPath = 'TrackLab/backups';
    const fileName = `${currentDate}.txt`;
    const mimeType = 'text/plain';

    await this.fileService.saveFile(
      content,
      dirPath,
      fileName,
      mimeType,
    );

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
    } catch (e) {
      // do nothing
    }

    const password = await this.askPasswordToRestore();

    if (password) {
      try {
        await this.fillDatabase(decode(content, password));
      } catch (e) {
        if ((e instanceof Error ? e.message : String(e)) == 'Malformed UTF-8 data') {
          await this.showMessage('TK_WRONG_PASSWORD');
        }
      }
    }
  }

  async fillDatabase(backup: Backup) {
    const confirmation = await this.askDatabaseToReset();

    if (!confirmation) {
      return;
    }

    const helper = this.getHelper(backup.version);

    backup = helper.prepareBackup(backup);

    await this.clearDatabase();

    await this.activityActionService.bulkAdd(backup.activityActions);
    await this.actionService.bulkAdd(backup.actions);
    await this.activityService.bulkAdd(backup.activities);
    await this.achievementService.bulkAdd(backup.achievements);
    await this.tagService.bulkAdd(backup.tags);
    await this.actionTagService.bulkAdd(backup.actionTags);
    await this.activityTagService.bulkAdd(backup.activityTags);

    await this.actionLibraryService.bulkAdd(backup.actionLibraries);
    await this.actionMetricService.bulkAdd(backup.actionMetrics);
    await this.activityLibraryItemService.bulkAdd(backup.activityLibraryItems);
    await this.activityMetricService.bulkAdd(backup.activityMetrics);
    await this.libraryItemService.bulkAdd(backup.libraryItems);
    await this.libraryService.bulkAdd(backup.libraries);
    await this.metricService.bulkAdd(backup.metrics);
    await this.streakService.bulkAdd(backup.streaks);

    await this.showMessage('TK_DATABASE_HAS_BEEN_RESTORED_SUCCESSFULLY');
  }

  async clearDatabase() {
    await this.activityActionService.clear();
    await this.actionService.clear();
    await this.activityService.clear();
    await this.achievementService.clear();
    await this.tagService.clear();
    await this.actionTagService.clear();
    await this.activityTagService.clear();

    await this.actionLibraryService.clear();
    await this.actionMetricService.clear();
    await this.activityLibraryItemService.clear();
    await this.activityMetricService.clear();
    await this.libraryItemService.clear();
    await this.libraryService.clear();
    await this.metricService.clear();
    await this.streakService.clear();
  }

  getHelper(version: string) {
    if (!version) {
      return helperRevision2;
    }

    const [fileMajor, fileMinor, filePatch] = version.split('.').map(Number);

    const map = this.versionMap.find((map) => {
      const [mapMajor, mapMinor, mapPatch] = map.version.split('.').map(Number);

      return mapMajor < fileMajor
        || mapMajor == fileMajor && mapMinor < fileMinor
        || mapMajor == fileMajor && mapMinor == fileMinor && mapPatch <= filePatch;
    });

    return map?.helper ?? helperRevision2;
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