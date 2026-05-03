import { Component, ViewChild, inject } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonButtons, IonButton, IonIcon, IonFab, IonFabButton } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, format } from 'date-fns';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { formatDisplayDate } from 'src/app/functions/date';
import { IActivity } from 'src/app/db/models/activity';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';
import { IMetric } from 'src/app/db/models/metric';
import { MetricService } from 'src/app/services/metric.service';
import { ListService } from 'src/app/services/list.service';
import { IList } from 'src/app/db/models/list';
import { IRule } from 'src/app/db/models/rule';
import { RuleService } from 'src/app/services/rule.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { NavigationService } from 'src/app/services/navigation.service';
import { DatePickerComponent } from 'src/app/form-elements/date-picker/date-picker.component';

@Component({
  selector: 'app-activity-list-page',
  templateUrl: './activity-list.page.html',
  styleUrl: './activity-list.page.scss',
  imports: [IonIcon, IonButton, IonText, IonContent, IonHeader, IonToolbar, IonTitle, CommonModule, IonButtons, TranslateModule, ActivityListComponent, IonFab, IonFabButton, BackButtonComponent, DatePickerComponent],
})
export class ActivityListPage {
  private activityService = inject(ActivityService);
  private metricService = inject(MetricService);
  private listService = inject(ListService);
  private ruleService = inject(RuleService);
  private navigationService = inject(NavigationService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('datePicker') datePickerRef!: DatePickerComponent;

  activities: IActivity[] = [];
  metrics: IMetric[] = [];
  lists: IList[] = [];
  rules: IRule[] = [];
  currentDate: string = '';

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

    await Promise.all([this.setActivities(), this.setMetrics(), this.setLists(), this.setRules()]);
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

  openDatePicker() {
    this.datePickerRef.writeValue(this.currentDate);
    this.datePickerRef.openPicker();
  }

  async onDateSelected(date: string) {
    if (date && date !== this.currentDate) {
      this.currentDate = date;
      this.setQueryParams(this.currentDate);
      await this.setActivities();
    }
  }

  setQueryParams(date: string) {
    this.router.navigate([], { queryParams: { date } });
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

  async setRules() {
    this.rules = await this.ruleService.getAll();
  }

  get displayDate(): string {
    return formatDisplayDate(this.currentDate, this.translate.currentLang || 'en');
  }

  get showBackButton(): boolean {
    return !!this.navigationService.previousUrl?.startsWith('/rule/')
      || !!this.navigationService.previousUrl?.startsWith('/stats')
      || this.navigationService.fromDashboard;
  }

  async goToAddPage() {
    await this.router.navigate(['/activity/add']);
  }
}
