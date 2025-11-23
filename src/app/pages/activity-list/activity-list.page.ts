import { Component, inject } from '@angular/core';
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
import { IMetric } from 'src/app/db/models/metric';
import { MetricService } from 'src/app/services/metric.service';
import { LibraryService } from 'src/app/services/library.service';
import { ILibrary } from 'src/app/db/models/library';

@Component({
  selector: 'app-activity-list-page',
  templateUrl: './activity-list.page.html',
  styleUrl: './activity-list.page.scss',
  imports: [IonActionSheet, IonIcon, IonButton, IonText, IonContent, IonHeader, IonToolbar, IonTitle, CommonModule, IonButtons, TranslateModule, ActivityListComponent],
})
export class ActivityListPage {
  private activityService = inject(ActivityService);
  private metricService = inject(MetricService);
  private libraryService = inject(LibraryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private markdownParserService = inject(MarkdownParserService);
  private translate = inject(TranslateService);

  activities: IActivity[] = [];
  metrics: IMetric[] = [];
  libraries: ILibrary[] = [];
  currentDate: string = '';

  public listActionSheetButtons = [
    {
      text: this.translate.instant('TK_EXPORT_MD'),
      data: {
        action: 'export',
      },
    },
  ];

  async ionViewDidEnter() {
    let date = this.route.snapshot.queryParamMap.get('date');

    if (!date) {
      const lastActivity = await this.activityService.getLastEnriched();
      date = lastActivity?.date ?? format(new Date(), 'yyyy-MM-dd');
    }

    this.currentDate = date;

    await this.setActivities();
    await this.setMetrics();
    await this.setLibraries();
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

  async setMetrics() {
    this.metrics = await this.metricService.getAll();
  }

  async setLibraries() {
    this.libraries = await this.libraryService.getAll();
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