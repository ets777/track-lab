import { Component, OnInit } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonList, IonLabel, IonText, IonButtons, IonButton } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { IActivity } from 'src/app/db';
import { ActivatedRoute } from '@angular/router';
import { addDays, format } from 'date-fns';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';

@Component({
  selector: 'app-activity-list',
  templateUrl: './activity-list.page.html',
  styleUrl: './activity-list.page.scss',
  imports: [IonButton, IonText, IonLabel, IonList, IonItem, IonContent, IonHeader, IonToolbar, IonTitle, CommonModule, IonButtons],
})
export class ActivityListPage {
  activities: IActivity[] = [];
  currentDate: string = '';

  constructor(
    private activityService: ActivityService,
    private route: ActivatedRoute,
    private markdownParserService: MarkdownParserService,
  ) { }

  async ionViewWillEnter() {
    let date = this.route.snapshot.paramMap.get('date');

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
    await this.setActivities();
  }

  async goToNextDay() {
    const nextDate = addDays(new Date(this.currentDate), 1);
    this.currentDate = format(nextDate, 'yyyy-MM-dd');
    await this.setActivities();
  }

  async setActivities() {
    this.activities = await this.activityService.getByDate(this.currentDate);
  }

  test() {
    this.markdownParserService
      .readMarkdownFiles()
      .subscribe(async (result) => {
        for (const day of result) {
          for (const activity of day) {
            if (activity) {
              await this.activityService.add(activity);
            }
          }
        }
      });
  }
}