import { Component, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { IonHeader, IonContent, IonItem, IonLabel, IonList, IonText, IonToolbar, IonTitle, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Time } from 'src/app/Time';
import { Router } from '@angular/router';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { IMetric } from 'src/app/db/models/metric';

interface NormalizedPoint {
  time: string;
  value: number | undefined;
}

@Component({
  selector: 'app-stats',
  imports: [IonText, IonList, IonLabel, IonItem, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BaseChartDirective, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, FormsModule, ReactiveFormsModule, DatePeriodInputComponent],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private activityService = inject(ActivityService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);

  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
    avgValue: number,
  }[] = [];
  metric: IMetric = {
    id: 1,
    name: 'mood',
    step: 1,
    isHidden: false,
  };

  chartData!: ChartConfiguration<'line'>['data'];
  public filterForm: FormGroup;

  constructor() {
    this.filterForm = this.formBuilder.group({
      datePeriod: [],
    });

    this.filterForm.valueChanges.subscribe(async (value) => {
      if (this.filterForm.valid) {
        await this.loadStats();
      }
    });
  }

  async loadStats() {
    const { startDate, endDate } = this.filterForm.value.datePeriod;

    if (!startDate || !endDate) {
      return;
    }

    const activities = await this.activityService.getByDate(startDate, endDate);

    this.activities = activities;
    const dates = [...new Set(activities.map((activity) => activity.date))]
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    this.activitiesGroupedByDate = dates
      .map((date) => {
        const activitiesAtDate = activities.filter((activity) => activity.date == date);
        const normalizedData = this.normalizeWithInterpolation(activitiesAtDate);
        return {
          date: date,
          activities: activitiesAtDate,
          avgValue: this.getAverageValue(normalizedData),
        };
      });

    const avg = this.translate.instant('TK_AVG');
    const label = avg + ' ' + this.metric.name;

    if (dates.length === 1) {
      const normalizedData = this.normalizeWithInterpolation(this.activities);

      this.chartData = {
        labels: normalizedData.map((data) => data.time),
        datasets: [
          { data: normalizedData.map((data) => data.value || 0), label },
        ]
      };
    } else {
      this.chartData = {
        labels: dates,
        datasets: [
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgValue), label },
        ]
      };
    }
  }

  normalizeWithInterpolation(activities: IActivity[]): NormalizedPoint[] {
    const result: NormalizedPoint[] = [];

    const sorted = [...activities].sort(
      (a, b) => new Time(a.startTime).valueOf() - new Time(b.startTime).valueOf(),
    );

    const first = [...activities].find((activity) =>
      activity.metricRecords.some((record) => record.metricId == this.metric.id),
    );
    const last = [...activities].reverse().find((activity) =>
      activity.metricRecords.some((record) => record.metricId == this.metric.id),
    );

    const startHour = new Time(first?.startTime).getHour();
    let lastHour = new Time(last?.startTime).getHour();

    if (startHour > lastHour) {
      lastHour += 24;
    }

    for (let hour = startHour; hour <= lastHour + 1; hour++) {
      const currentTime = new Time(hour % 24, 0, 0);
      const label = currentTime.toString(false);
      const value = this.getInterpolatedValue(sorted, hour);

      result.push({ time: label, value });
    }

    return result;
  }

  getInterpolatedValue(activities: IActivity[], hour: number) {
    const currentTime = new Time(hour % 24, 0, 0);
    const currentSeconds = currentTime.getSecond();

    const before = [...activities].reverse().find((activity) =>
      new Time(activity.endTime).getSecond() <= currentSeconds
      && activity.metricRecords.some((record) => record.metricId == this.metric.id),
    );
    const after = activities.find((activity) =>
      new Time(activity.endTime).getSecond() >= currentSeconds
      && activity.metricRecords.some((record) => record.metricId == this.metric.id),
    );

    const recordBefore = before?.metricRecords.find((record) => record.metricId == this.metric.id);
    const recordAfter = after?.metricRecords.find((record) => record.metricId == this.metric.id);

    let value: number = 0;
    if (
      before && recordBefore
      && after && recordAfter
      && recordBefore.value !== recordAfter.value
    ) {
      const beforeTime = new Time(before.endTime).getSecond();
      const afterTime = new Time(after.endTime).getSecond();
      const ratio = (currentSeconds - beforeTime) / (afterTime - beforeTime);

      value = recordBefore.value + (recordAfter.value - recordBefore.value) * ratio;
    } else if (recordBefore) {
      value = recordBefore.value;
    } else if (recordAfter) {
      value = recordAfter.value;
    } else {
      value = 0;
    }

    return value;
  }

  getTotalAverageValue() {
    if (!this.activitiesGroupedByDate.length) {
      return 0;
    }

    const sum = this.activitiesGroupedByDate
      .reduce((previousValue, currentValue) => (currentValue.avgValue ?? 0) + previousValue, 0);

    return sum / this.activitiesGroupedByDate.length;
  }

  getAverageValue(normalizedData: NormalizedPoint[]) {
    if (!normalizedData.length) {
      return 0;
    }

    const sum = normalizedData
      .reduce((previousValue, currentValue) => (currentValue.value ?? 0) + previousValue, 0);

    return sum / normalizedData.length;
  }

  async showError(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      icon: 'warning-outline',
      cssClass: 'tall-toast',
    });
    await toast.present();
  }

  async goToDay(date: string) {
    await this.router.navigate(
      ['/activity'],
      { queryParams: { date } },
    );
  }
}
