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
import { IActionListDb } from '../db/models/action-list';
import { IActionMetricDb } from '../db/models/action-metric';
import { IActivityItemDb } from '../db/models/activity-item';
import { IActivityMetricDb } from '../db/models/activity-metric';
import { IItemDb } from '../db/models/item';
import { IListDb } from '../db/models/list';
import { IMetricDb } from '../db/models/metric';
import { IStreakDb } from '../db/models/streak';
import { ITagMetricDb } from '../db/models/tag-metric';
import { IItemMetricDb } from '../db/models/item-metric';
import { ActionListService } from './action-list.service';
import { ActionMetricService } from './action-metric.service';
import { ActivityItemService } from './activity-item.service';
import { ActivityMetricService } from './activity-metric.service';
import { ItemService } from './item.service';
import { ListService } from './list.service';
import { MetricService } from './metric.service';
import { StreakService } from './streak.service';
import { TagMetricService } from './tag-metric.service';
import { ItemMetricService } from './item-metric.service';
import { getEntitiesFromString } from '../functions/string';
import { LoadingService } from './loading.service';
import { ALL_BASE_LIST_NAMES, ALL_BASE_METRIC_NAMES, BASE_LIST_DEFAULTS, BASE_METRIC_DEFAULTS } from '../db/base-entity-names';

type Backup = {
  activities: IActivityDb[],
  actions: IActionDb[],
  activityActions: IActivityActionDb[],
  achievements: IAchievementDb[],
  tags: ITagDb[],
  actionTags: IActionTagDb[],
  activityTags: IActivityTagDb[],
  actionLists: IActionListDb[],
  actionMetrics: IActionMetricDb[],
  activityItems: IActivityItemDb[],
  activityMetrics: IActivityMetricDb[],
  items: IItemDb[],
  lists: IListDb[],
  metrics: IMetricDb[],
  streaks: IStreakDb[],
  tagMetrics: ITagMetricDb[],
  itemMetrics: IItemMetricDb[],
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
    const emotionListId = 1;

    backup.metrics = [
      {
        id: moodMetricId,
        name: 'TK_MOOD',
        step: 1,
        minValue: 1,
        maxValue: 10,
        isHidden: false,
        isBase: true,
      },
      {
        id: energyMetricId,
        name: 'TK_ENERGY',
        step: 1,
        minValue: 1,
        maxValue: 10,
        isHidden: false,
        isBase: true,
      },
      {
        id: 3,
        name: 'TK_SATIETY',
        step: 1,
        minValue: 1,
        maxValue: 10,
        isHidden: false,
        isBase: true,
      },
    ];

    backup.lists = [{
      id: emotionListId,
      name: 'TK_EMOTIONS',
      isBase: true,
    }];

    backup.activityMetrics = [];
    backup.items = [];
    backup.activityItems = [];

    let itemId = 1;

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
          let item = backup.items.find(
            (i: any) => i.name == emotion,
          );

          if (!item) {
            backup.items.push({
              id: itemId,
              name: emotion,
              listId: emotionListId,
            });

            backup.activityItems.push({
              activityId: activity.id,
              itemId: itemId,
            });

            itemId++;
          } else {
            backup.activityItems.push({
              activityId: activity.id,
              itemId: item.id,
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

    backup.actionLists = [];
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
  private actionListService = inject(ActionListService);
  private actionMetricService = inject(ActionMetricService);
  private activityItemService = inject(ActivityItemService);
  private activityMetricService = inject(ActivityMetricService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private metricService = inject(MetricService);
  private streakService = inject(StreakService);
  private tagMetricService = inject(TagMetricService);
  private itemMetricService = inject(ItemMetricService);
  private fileService = inject(FileService);
  private loadingService = inject(LoadingService);

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

      actionLists: await this.actionListService.getAll(),
      actionMetrics: await this.actionMetricService.getAll(),
      activityItems: await this.activityItemService.getAll(),
      activityMetrics: await this.activityMetricService.getAll(),
      items: await this.itemService.getAll(),
      lists: await this.listService.getAll(),
      metrics: await this.metricService.getAll(),
      streaks: await this.streakService.getAll(),
      tagMetrics: await this.tagMetricService.getAll(),
      itemMetrics: await this.itemMetricService.getAll(),

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

    try {
      this.loadingService.show('TK_CLEARING_DATABASE');
      await this.clearDatabase();

      this.loadingService.show('TK_RESTORING_ACTIONS');
      await this.actionService.bulkAdd(backup.actions);

      this.loadingService.show('TK_RESTORING_TAGS');
      await this.tagService.bulkAdd(backup.tags);

      this.loadingService.show('TK_RESTORING_ACTIVITIES');
      await this.activityService.bulkAdd(backup.activities);
      await this.activityActionService.bulkAdd(backup.activityActions);
      await this.activityTagService.bulkAdd(backup.activityTags);

      this.loadingService.show('TK_RESTORING_ACHIEVEMENTS');
      await this.achievementService.bulkAdd(backup.achievements);

      this.loadingService.show('TK_RESTORING_LISTS');
      await this.listService.bulkAdd(backup.lists);
      await this.actionTagService.bulkAdd(backup.actionTags);
      await this.actionListService.bulkAdd(backup.actionLists);

      this.loadingService.show('TK_RESTORING_METRICS');
      await this.metricService.bulkAdd(backup.metrics);
      await this.actionMetricService.bulkAdd(backup.actionMetrics);
      await this.tagMetricService.bulkAdd(backup.tagMetrics ?? []);
      await this.itemMetricService.bulkAdd(backup.itemMetrics ?? []);

      this.loadingService.show('TK_RESTORING_ITEMS');
      await this.itemService.bulkAdd(backup.items);
      await this.activityItemService.bulkAdd(backup.activityItems);
      await this.activityMetricService.bulkAdd(backup.activityMetrics);

      this.loadingService.show('TK_RESTORING_STREAKS');
      await this.streakService.bulkAdd(backup.streaks);
    } finally {
      this.loadingService.hide();
    }

    await this.showMessage('TK_DATABASE_HAS_BEEN_RESTORED_SUCCESSFULLY');
  }

  async clearDatabase() {
    await this.activityService.clear();
    await this.activityActionService.clear();
    await this.activityTagService.clear();
    await this.activityItemService.clear();
    await this.activityMetricService.clear();
    await this.achievementService.clear();
    await this.streakService.clear();

    await this.tagMetricService.clear();
    await this.itemMetricService.clear();
    await this.actionMetricService.clear();
    await this.actionListService.clear();
    await this.actionTagService.clear();

    const lists = await this.listService.getAll();
    for (const list of lists) {
      if (ALL_BASE_LIST_NAMES.includes(list.name) && !list.isBase) {
        await this.listService.update(list.id, { isBase: true });
        list.isBase = true;
      }
    }
    for (const list of lists) {
      if (!list.isBase) {
        await this.itemService.delete({ listId: list.id });
      }
    }
    await this.listService.clearNonBase();

    const remainingLists = await this.listService.getAll();
    const remainingListNames = new Set(remainingLists.map(l => l.name));
    for (const defaults of BASE_LIST_DEFAULTS) {
      if (!defaults.names.some(n => remainingListNames.has(n))) {
        await this.listService.add({ name: defaults.canonical, isBase: defaults.isBase });
      }
    }

    const metrics = await this.metricService.getAll();
    for (const metric of metrics) {
      if (ALL_BASE_METRIC_NAMES.includes(metric.name) && !metric.isBase) {
        await this.metricService.update(metric.id, { isBase: true });
      }
    }
    await this.metricService.clearNonBase();

    const remainingMetrics = await this.metricService.getAll();
    const remainingMetricNames = new Set(remainingMetrics.map(m => m.name));
    for (const defaults of BASE_METRIC_DEFAULTS) {
      if (!defaults.names.some(n => remainingMetricNames.has(n))) {
        const { names, canonical, ...createDto } = defaults;
        await this.metricService.add({ ...createDto, name: canonical });
      }
    }

    await this.actionService.clear();
    await this.tagService.clear();
  }

  getHelper(version: string) {
    if (!version) {
      return helperRevision1;
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

  async askFreshStart(): Promise<boolean> {
    const alert = await this.alertController.create({
      message: this.translate.instant('TK_LONG_BREAK_MESSAGE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });

    await alert.present();

    const { role } = await alert.onDidDismiss();

    return role === 'yes';
  }

  async askDatabaseToReset(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CONFIRMATION'),
      subHeader: this.translate.instant('TK_RESET_DATABASE_CONFIRMATION'),
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
