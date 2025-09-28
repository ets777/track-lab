import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonItem, IonList, IonLabel, IonButtons, IonButton, IonIcon, IonActionSheet, IonText, ActionSheetController } from "@ionic/angular/standalone";
import { OverlayEventDetail } from '@ionic/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { actionsToString } from 'src/app/functions/action';
import { ActivityService } from 'src/app/services/activity.service';

@Component({
  selector: 'app-activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss'],
  imports: [IonText, IonActionSheet, IonIcon, IonButton, IonButtons, IonLabel, IonList, IonItem, TranslateModule],
})
export class ActivityListComponent implements OnInit {
  @Input('activities') activities: IActivity[] = [];

  actionsToString = actionsToString;

  public activityActionSheetButtons = [
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

  constructor(
    private translate: TranslateService,
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
    private activityService: ActivityService,
  ) { }

  ngOnInit() { }

  async doActivityAction(event: CustomEvent<OverlayEventDetail>, activityId: number) {
    const action = event.detail.data?.action;

    switch (action) {
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
      await this.activityService.delete(activityId);
      // refresh list
      // await this.setActivities();
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

}
