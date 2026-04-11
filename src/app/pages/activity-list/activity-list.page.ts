import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonButtons, IonButton, IonIcon, IonActionSheet, IonFab, IonFabButton } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, format } from 'date-fns';
import { TranslateModule } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';
import { IMetric } from 'src/app/db/models/metric';
import { MetricService } from 'src/app/services/metric.service';
import { ListService } from 'src/app/services/list.service';
import { IList } from 'src/app/db/models/list';

@Component({
  selector: 'app-activity-list-page',
  templateUrl: './activity-list.page.html',
  styleUrl: './activity-list.page.scss',
  imports: [IonIcon, IonButton, IonText, IonContent, IonHeader, IonToolbar, IonTitle, CommonModule, IonButtons, TranslateModule, ActivityListComponent, IonFab, IonFabButton],
})
export class ActivityListPage {
  private activityService = inject(ActivityService);
  private metricService = inject(MetricService);
  private listService = inject(ListService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('dateInput') dateInputRef?: ElementRef<HTMLInputElement>;

  activities: IActivity[] = [];
  metrics: IMetric[] = [];
  lists: IList[] = [];
  currentDate: string = '';
  editingDate = false;
  checkmarkVisible = false;
  private checkmarkTimer: ReturnType<typeof setTimeout> | null = null;

  public listActionSheetButtons: any[] = [];

  async ionViewDidEnter() {
    let date = this.route.snapshot.queryParamMap.get('date');

    if (!date) {
      try {
        const lastActivity = await this.activityService.getLastEnriched();
        date = lastActivity?.date ?? format(new Date(), 'yyyy-MM-dd');
      } catch {
        date = format(new Date(), 'yyyy-MM-dd');
      }
    }

    this.currentDate = date;

    await this.setActivities();
    await this.setMetrics();
    await this.setLists();
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

  async setLists() {
    this.lists = await this.listService.getAll();
  }

  startEditingDate() {
    this.editingDate = true;
    this.checkmarkVisible = true;
    if (this.checkmarkTimer) clearTimeout(this.checkmarkTimer);
    setTimeout(() => this.dateInputRef?.nativeElement.focus(), 0);
  }

  async onDateInputBlur(event: Event) {
    if (!this.editingDate) return;
    const value = (event.target as HTMLInputElement).value;
    this.checkmarkVisible = false;
    this.checkmarkTimer = setTimeout(() => { this.editingDate = false; }, 180);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value !== this.currentDate) {
      this.currentDate = value;
      this.setQueryParams(this.currentDate);
      await this.setActivities();
    }
  }

  async goToAddPage() {
    await this.router.navigate(['/activity/add']);
  }
}
