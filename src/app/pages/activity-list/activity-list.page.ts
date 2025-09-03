import { Component, OnInit } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonList, IonLabel, IonText, IonButtons, IonButton, IonIcon, IonActionSheet, ActionSheetController } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { IActivity } from 'src/app/db';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, format } from 'date-fns';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';
import type { OverlayEventDetail } from '@ionic/core';

@Component({
  selector: 'app-activity-list',
  templateUrl: './activity-list.page.html',
  styleUrl: './activity-list.page.scss',
  imports: [IonActionSheet, IonIcon, IonButton, IonText, IonLabel, IonList, IonItem, IonContent, IonHeader, IonToolbar, IonTitle, CommonModule, IonButtons],
})
export class ActivityListPage {
  activities: IActivity[] = [];
  currentDate: string = '';

  public actionSheetButtons = [
    {
      text: 'Edit',
      data: {
        action: 'edit',
      },
    },
    {
      text: 'Delete',
      role: 'destructive',
      data: {
        action: 'delete',
      },
    },
  ];

  constructor(
    private activityService: ActivityService,
    private route: ActivatedRoute,
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
  ) { }

  async ionViewDidEnter() {
    let date = this.route.snapshot.queryParamMap.get('date');

    if (!date) {
      const lastActivity = await this.activityService.getLast();
      date = lastActivity?.date ?? format(new Date(), 'yyyy-MM-dd');
    }

    this.currentDate = date;

    await this.setActivities();
  }

  async goToPreviousDay() {
    const previousDate = addDays(new Date(this.currentDate), -1); 
    this.currentDate = format(previousDate, 'yyyy-MM-dd');
    this.setQueryParams(this.currentDate);
    await this.setActivities();
  }

  async goToNextDay() {
    const nextDate = addDays(new Date(this.currentDate), 1);
    this.currentDate = format(nextDate, 'yyyy-MM-dd');
    this.setQueryParams(this.currentDate);
    await this.setActivities();
  }

  setQueryParams(date: string) {
    this.router.navigate(
      [],
      { queryParams: { date } },
    );
  }

  async setActivities() {
    this.activities = await this.activityService.getByDate(this.currentDate);
  }

  async doAction(event: CustomEvent<OverlayEventDetail>, activityId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'delete':
        this.deleteActivity(activityId);
        break;
      case 'edit':
        this.goToEditPage(activityId);
        break;
      default:
        break;
    }
  }

  async deleteActivity(activityId: number) {
    const answer = await this.confirm();

    if (answer) {
      this.activityService.delete(activityId);
      await this.setActivities();
    }
  }

  async goToEditPage(activityId: number) {
    await this.router.navigate(['/activity-edit', activityId]);
  }

  async confirm() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Are you sure?',
      buttons: [
        {
          text: 'Yes',
          role: 'confirm',
        },
        {
          text: 'No',
          role: 'cancel',
        },
      ],
    });

    actionSheet.present();

    const { role } = await actionSheet.onWillDismiss();

    return role === 'confirm';
  }
}