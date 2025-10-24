import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { IonHeader, IonContent, IonItem, IonLabel, IonList, IonText, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Time } from 'src/app/Time';
import { Router } from '@angular/router';
import { DatePeriod } from 'src/app/types/date-period';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';

type ActivityNumberKeys = ('mood' | 'satiety' | 'energy');

interface NormalizedPoint {
  time: string;
  mood: number | undefined;
  satiety: number | undefined;
  energy: number | undefined;
}

@Component({
  selector: 'app-stats',
  imports: [IonText, IonList,  IonLabel, IonItem, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BaseChartDirective, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, FormsModule, ReactiveFormsModule, DatePeriodInputComponent],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage implements OnInit {
  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
    avgMood: number,
    avgSatiety: number,
    avgEnergy: number,
  }[] = [];

  chartData!: ChartConfiguration<'line'>['data'];
  public filterForm: FormGroup;

  constructor(
    private activityService: ActivityService,
    private toastCtrl: ToastController,
    private router: Router,
    private formBuilder: FormBuilder,
    private translate: TranslateService,
  ) {
    this.filterForm = this.formBuilder.group({
      datePeriod: [],
    });

    this.filterForm.valueChanges.subscribe(async (value) => {
      if (this.filterForm.valid) {
        await this.loadStats();
      }
    });
  }

  async ngOnInit() {}

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
          avgEnergy: this.getAverageValue(normalizedData, 'energy'),
          avgMood: this.getAverageValue(normalizedData, 'mood'),
          avgSatiety: this.getAverageValue(normalizedData, 'satiety'),
        };
      });

    const avg = this.translate.instant('TK_AVG');
    const moodLabel = avg + ' ' + this.translate.instant('TK_MOOD');
    const energyLabel = avg + ' ' + this.translate.instant('TK_ENERGY');
    const satietyLabel = avg + ' ' + this.translate.instant('TK_SATIETY');

    if (dates.length === 1) {
      const normalizedData = this.normalizeWithInterpolation(this.activities);

      this.chartData = {
        labels: normalizedData.map((data) => data.time),
        datasets: [
          { data: normalizedData.map((data) => data.mood || 0), label: moodLabel },
          { data: normalizedData.map((data) => data.energy || 0), label: energyLabel },
          { data: normalizedData.map((data) => data.satiety || 0), label: satietyLabel },
        ]
      };
    } else {
      this.chartData = {
        labels: dates,
        datasets: [
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgMood), label: moodLabel },
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgEnergy), label: energyLabel },
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgSatiety), label: satietyLabel },
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
      activity.mood && activity.energy && activity.satiety
    );
    const last = [...activities].reverse().find((activity) =>
      activity.mood && activity.energy && activity.satiety
    );

    const startHour = new Time(first?.startTime).getHour();
    let lastHour = new Time(last?.startTime).getHour();

    if (startHour > lastHour) {
      lastHour += 24;
    }

    for (let hour = startHour; hour <= lastHour + 1; hour++) {
      const currentTime = new Time(hour % 24, 0, 0);
      const label = currentTime.toString(false);
      const mood = this.getInterpolatedValue(sorted, hour, 'mood');
      const energy = this.getInterpolatedValue(sorted, hour, 'energy');
      const satiety = this.getInterpolatedValue(sorted, hour, 'satiety');

      result.push({ time: label, mood, energy, satiety });
    }

    return result;
  }

  getInterpolatedValue(activities: IActivity[], hour: number, propertyName: ('mood'|'satiety'|'energy')) {
    const currentTime = new Time(hour % 24, 0, 0);
    const currentSeconds = currentTime.getSecond();

    const before = [...activities].reverse().find((activity) =>
      new Time(activity.endTime).getSecond() <= currentSeconds
      && activity[propertyName]
    );
    const after = activities.find((activity) =>
      new Time(activity.endTime).getSecond() >= currentSeconds
      && activity[propertyName]
    );

    let value: number = 0;
    if (
      before?.[propertyName] && after?.[propertyName] && before[propertyName] !== after[propertyName]
    ) {
      const beforeTime = new Time(before.endTime).getSecond();
      const afterTime = new Time(after.endTime).getSecond();
      const ratio = (currentSeconds - beforeTime) / (afterTime - beforeTime);
      if (before[propertyName] && after[propertyName]) {
        value = before[propertyName] + (after[propertyName] - before[propertyName]) * ratio;
      }
    } else if (before?.[propertyName]) {
      value = before[propertyName];
    } else if (after?.[propertyName]) {
      value = after[propertyName];
    } else {
      value = 0;
    }

    return value;
  }

  getTotalAverageValue(propertyName: ('avgSatiety' | 'avgEnergy' | 'avgMood')) {
    if (!this.activitiesGroupedByDate.length) {
      return 0;
    }

    const sum = this.activitiesGroupedByDate
      .reduce((previousValue, currentValue) => (currentValue[propertyName] ?? 0) + previousValue, 0);

    return sum / this.activitiesGroupedByDate.length;
  }

  getAverageValue(normalizedData: NormalizedPoint[], propertyName: ActivityNumberKeys) {
    if (!normalizedData.length) {
      return 0;
    }

    const sum = normalizedData
      .reduce((previousValue, currentValue) => (currentValue[propertyName] ?? 0) + previousValue, 0);

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
