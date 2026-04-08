import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonItem, IonList, IonLabel, IonButtons, IonButton, IonIcon, IonActionSheet, IonText, ActionSheetController } from "@ionic/angular/standalone";
import { OverlayEventDetail } from '@ionic/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { entitiesToString } from 'src/app/functions/string';
import { ActivityService } from 'src/app/services/activity.service';
import { TagsComponent } from "../tags/tags.component";
import { ToastService } from 'src/app/services/toast.service';
import { IMetric } from 'src/app/db/models/metric';
import { IList } from 'src/app/db/models/list';
import { ITag } from 'src/app/db/models/tag';

@Component({
  selector: 'app-activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss'],
  imports: [IonText, IonActionSheet, IonIcon, IonButton, IonButtons, IonLabel, IonList, IonItem, TranslateModule, TagsComponent],
})
export class ActivityListComponent {
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);
  router = inject(Router);
  private activityService = inject(ActivityService);
  private toastService = inject(ToastService);

  // TODO: this is very stupid, I know. Needs to be reworked during moving to signals
  @Input() activities: IActivity[] = [];
  @Input() metrics: IMetric[] = [];
  @Input() lists: IList[] = [];

  entitiesToString = entitiesToString;

  public activityActionSheetButtons = [
    {
      text: this.translate.instant('TK_VIEW'),
      data: {
        action: 'view',
      },
    },
    {
      text: this.translate.instant('TK_EDIT'),
      data: {
        action: 'edit',
      },
    },
    {
      text: this.translate.instant('TK_DELETE'),
      role: 'destructive',
      data: {
        action: 'delete',
      },
    },
  ];

  async doActivityAction(event: CustomEvent<OverlayEventDetail>, activityId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/activity/view', activityId]);
        break;
      case 'delete':
        await this.deleteActivity(activityId);
        break;
      case 'edit':
        await this.goToEditPage(activityId);
        break;
      default:
        break;
    }
  }

  async deleteActivity(activityId: number) {
    const answer = await this.confirm();

    if (answer) {
      await this.activityService.deleteWithRelations(activityId);
      this.activities = this.activities
        .filter((activity) => activity.id !== activityId);

      this.toastService.enqueue({
        title: 'TK_ACTIVITY_DELETED_SUCCESSFULLY',
        type: 'success',
      });
    }
  }

  async confirm() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        {
          text: this.translate.instant('TK_YES'),
          role: 'confirm',
        },
        {
          text: this.translate.instant('TK_NO'),
          role: 'cancel',
        },
      ],
    });

    actionSheet.present();

    const { role } = await actionSheet.onWillDismiss();

    return role === 'confirm';
  }

  async goToEditPage(activityId: number) {
    await this.router.navigate(['/activity/edit', activityId]);
  }

  activityHasMetric(activity: IActivity, metric: IMetric) {
    const activityMetrics = activity.metricRecords;

    return activityMetrics.some((record) => record.metricId == metric.id);
  }

  getMetricValue(activity: IActivity, metric: IMetric) {
    const activityMetrics = activity.metricRecords;
    const record = activityMetrics.find((record) => record.metricId == metric.id);

    return record?.value;
  }

  activityHasItems(activity: IActivity, list: IList) {
    return activity.items.some((item) => item.listId == list.id);
  }

  getItems(activity: IActivity, list: IList) {
    const items = activity.items.filter((item) => item.listId == list.id);
    return entitiesToString(items);
  }

  getAllTags(activity: IActivity): ITag[] {
    const seen = new Set<number>();
    const all: ITag[] = [];
    for (const tag of [...activity.tags, ...activity.actions.flatMap(a => a.tags)]) {
      if (!seen.has(tag.id)) {
        seen.add(tag.id);
        all.push(tag);
      }
    }
    return all;
  }
}
