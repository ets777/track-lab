import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { IActivity } from 'src/app/db';
import { addDays, addMonths, format } from 'date-fns';
import { dateRangeValidator } from 'src/app/validators/date-range.validator';
import { maxDateRangeValidator } from 'src/app/validators/max-date-range.validator';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { maskitoDateOptionsGenerator } from '@maskito/kit';
import { MaskitoDirective } from '@maskito/angular';

type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T];

type ActivityNumberKeys = Exclude<NumberKeys<IActivity>, undefined>;

type Period = 'week' | 'month';

@Component({
  selector: 'app-activity-calendar',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, MaskitoDirective],
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
  activitiesGroupedByDate: { date: string, activities: IActivity[] }[] = [];
  selectedPeriod: Period = 'week';
  filterForm: FormGroup;

  isTooltipOpen = false;
  tooltipMessage = '';
  tooltipEvent: any;

  constructor(
    private activityService: ActivityService,
    private formBuilder: FormBuilder,
    private toastCtrl: ToastController,
  ) {
    this.filterForm = this.formBuilder.group({
      startDate: ['', [Validators.required, dateFormatValidator]],
      endDate: ['', [Validators.required, dateFormatValidator]],
    }, { validators: [dateRangeValidator, maxDateRangeValidator] });
  }

  ngOnInit() {
    this.setDefaultDates();
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

  async ionViewDidEnter() {
    await this.loadStats();
  }

  async loadStats() {
    const { startDate, endDate } = this.filterForm.value;

    if (!startDate || !endDate) {
      return;
    }

    const activities = await this.activityService.getByDate(startDate, endDate);

    this.activities = activities;
    this.activitiesGroupedByDate = [...new Set(activities.map((activity) => activity.date))]
      .map((date) => ({
        date: date,
        activities: activities.filter((activity) => activity.date == date),
      }));
  }

  getAverageValue(activities: IActivity[], propertyName: ActivityNumberKeys) {
    if (!activities.length) {
      return 0;
    }

    const filteredValues = activities
      .map((activity) => activity[propertyName])
      .filter((value) => value > 0);

    const sum = filteredValues
      .reduce((previousValue, currentValue) => currentValue + previousValue, 0);

    return sum / filteredValues.length;
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
      errorMessages.push(`${fieldName} is required`);
    }

    if (errors['maxDateRange']) {
      errorMessages.push(errors['maxDateRange'].message);
    }

    if (errors['dateRange']) {
      errorMessages.push(errors['dateRange'].message);
    }

    if (errors['dateFormat']) {
      errorMessages.push(errors['dateFormat'].message);
    }

    this.tooltipMessage = errorMessages.map((message) => `- ${message}`).join('<br>');
    this.tooltipEvent = ev;
    this.isTooltipOpen = true;
  }

  closeTooltip() {
    this.isTooltipOpen = false;
    this.tooltipMessage = '';
  }
}
