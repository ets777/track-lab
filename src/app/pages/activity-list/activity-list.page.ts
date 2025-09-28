import { Component } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonButtons, IonButton, IonIcon, IonActionSheet } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, format } from 'date-fns';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';
import type { OverlayEventDetail } from '@ionic/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';

@Component({
  selector: 'app-activity-list-page',
  templateUrl: './activity-list.page.html',
  styleUrl: './activity-list.page.scss',
  imports: [IonActionSheet, IonIcon, IonButton, IonText, IonContent, IonHeader, IonToolbar, IonTitle, CommonModule, IonButtons, TranslateModule, ActivityListComponent],
})
export class ActivityListPage {
  
  activities: IActivity[] = [];
  currentDate: string = '';

  public listActionSheetButtons = [
    {
      text: this.translate.instant('TK_EXPORT_MD'),
      data: {
        action: 'export',
      },
    },
  ];

  constructor(
    private activityService: ActivityService,
    private route: ActivatedRoute,
    private router: Router,
    private markdownParserService: MarkdownParserService,
    private translate: TranslateService,
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

  async doListAction(event: CustomEvent<OverlayEventDetail>) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'export':
        await this.export();
        break;
      default:
        break;
    }
  }

  async export() {
    await this.markdownParserService.exportMarkDownFile(this.currentDate);
  }
}