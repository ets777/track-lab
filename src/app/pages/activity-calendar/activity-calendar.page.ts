import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { IonIcon, IonInput, IonChip, IonHeader, IonPopover, IonContent, IonItem, IonLabel, IonButton, IonList, IonText, IonToolbar, IonTitle, IonSegmentButton, IonSegment, IonSegmentView, IonSegmentContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { addDays, addMonths, format } from 'date-fns';
import { dateRangeValidator } from 'src/app/validators/date-range.validator';
import { maxDateRangeValidator } from 'src/app/validators/max-date-range.validator';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { MaskitoDirective } from '@maskito/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AchievementService } from 'src/app/services/achievement.service';
import { IAchievement } from 'src/app/db/models/achievement';
import { Time } from 'src/app/Time';
import { Router } from '@angular/router';

type ActivityNumberKeys = ('mood' | 'satiety' | 'energy');

type Period = 'week' | 'month';

interface NormalizedPoint {
  time: string;
  mood: number | undefined;
  satiety: number | undefined;
  energy: number | undefined;
}

@Component({
  selector: 'app-activity-calendar',
  standalone: true,
  imports: [IonSegment, IonSegmentButton, IonTitle, IonToolbar, IonText, IonList, IonButton, IonIcon, IonInput, IonLabel, IonItem, IonContent, IonPopover, IonHeader, IonChip, CommonModule, FormsModule, ReactiveFormsModule, MaskitoDirective, TranslateModule, BaseChartDirective, IonSegmentView, IonSegmentContent],
  templateUrl: './activity-calendar.page.html',
  styleUrl: './activity-calendar.page.scss',
})
export class ActivityCalendarPage implements OnInit {
  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();

  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
    avgMood: number,
    avgSatiety: number,
    avgEnergy: number,
  }[] = [];
  selectedPeriod: Period = 'week';
  filterForm: FormGroup;

  isTooltipOpen = false;
  tooltipMessage = '';
  tooltipEvent: any;

  dates: string[] = [];
  chartData!: ChartConfiguration<'line'>['data'];

  achievements: IAchievement[] = [];

  constructor(
    private activityService: ActivityService,
    private formBuilder: FormBuilder,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private achievementService: AchievementService,
    private router: Router,
  ) {
    this.filterForm = this.formBuilder.group(
      {
        startDate: ['', [Validators.required, dateFormatValidator]],
        endDate: ['', [Validators.required, dateFormatValidator]],
      },
      {
        validators: [
          dateRangeValidator,
          maxDateRangeValidator(31),
        ]
      },
    );
  }

  async ngOnInit() {
    this.setDefaultDates();
  }

  async ionViewDidEnter() {
    await this.loadStats();
    this.achievements = await this.achievementService.getUnlocked();
  }

  setDefaultDates() {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    let startDate;

    if (this.selectedPeriod == 'week') {
      startDate = format(addDays(new Date(), -6), 'yyyy-MM-dd');
    } else {
      startDate = format(addMonths(new Date(), -1), 'yyyy-MM-dd');
    }

    this.filterForm.patchValue({
      startDate,
      endDate,
    });
  }

  async loadStats() {
    const { startDate, endDate } = this.filterForm.value;

    if (!startDate || !endDate) {
      return;
    }

    const activities = await this.activityService.getByDate(startDate, endDate);

    this.activities = activities;
    this.dates = [...new Set(activities.map((activity) => activity.date))];
    this.activitiesGroupedByDate = this.dates
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

    if (this.dates.length === 1) {
      const normalizedData = this.normalizeWithInterpolation(this.activities);

      this.chartData = {
        labels: normalizedData.map((data) => data.time),
        datasets: [
          { data: normalizedData.map((data) => data.mood || 0), label: 'Avg. Mood' },
          { data: normalizedData.map((data) => data.energy || 0), label: 'Avg. Energy' },
          { data: normalizedData.map((data) => data.satiety || 0), label: 'Avg. Satiety' },
        ]
      };
    } else {
      this.chartData = {
        labels: this.dates,
        datasets: [
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgMood), label: 'Avg. Mood' },
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgEnergy), label: 'Avg. Energy' },
          { data: this.activitiesGroupedByDate.map((activity) => activity.avgSatiety), label: 'Avg. Satiety' },
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

  async selectPeriod(period: Period) {
    this.selectedPeriod = period;

    this.setDefaultDates();
    await this.loadStats();
  }

  async shiftDates(shift: number) {
    const { startDate, endDate } = this.filterForm.value;

    if (this.selectedPeriod == 'week') {
      this.filterForm.patchValue({
        startDate: format(addDays(new Date(startDate), shift * 7), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(endDate), shift * 7), 'yyyy-MM-dd'),
      });
    } else {
      this.filterForm.patchValue({
        startDate: format(addMonths(new Date(startDate), shift * 1), 'yyyy-MM-dd'),
        endDate: format(addMonths(new Date(endDate), shift * 1), 'yyyy-MM-dd'),
      });
    }

    await this.loadStats();
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

  openTooltip(ev: Event, fieldName: string) {
    const errors = this.filterForm.get(fieldName)?.errors;
    const errorMessages = [];

    if (!errors) {
      return;
    }

    if (errors['required']) {
      errorMessages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    }

    if (errors['maxDateRange']) {
      errorMessages.push(
        this.translate.instant(
          errors['maxDateRange'].message,
          errors['maxDateRange'].params,
        ),
      );
    }

    if (errors['dateRange']) {
      errorMessages.push(this.translate.instant(errors['dateRange'].message));
    }

    if (errors['dateFormat']) {
      errorMessages.push(this.translate.instant(errors['dateFormat'].message));
    }

    this.tooltipMessage = errorMessages.map((message) => `- ${message}`).join('<br>');
    this.tooltipEvent = ev;
    this.isTooltipOpen = true;
  }

  closeTooltip() {
    this.isTooltipOpen = false;
    this.tooltipMessage = '';
  }

  async goToDay(date: string) {
    await this.router.navigate(
      ['/activity'],
      { queryParams: { date } },
    );
  }
}
