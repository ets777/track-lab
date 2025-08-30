import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { IActivity } from 'src/app/db';
import { addDays, format } from 'date-fns';

type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T];

type ActivityNumberKeys = Exclude<NumberKeys<IActivity>, undefined>;

@Component({
  selector: 'app-activity-calendar',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './activity-calendar.page.html',
})
export class ActivityCalendarPage implements OnInit {
  startDate: string = '';
  endDate: string = '';
  activities: IActivity[] = [];
  activitiesGroupedByDate: { date: string, activities: IActivity[] }[] = [];

  constructor(private activityService: ActivityService) { }

  async ngOnInit() {
    this.startDate = format(addDays(new Date(), -6), 'yyyy-MM-dd');
    this.endDate = format(new Date(), 'yyyy-MM-dd');
  }

  async ionViewDidEnter() {
    await this.loadStats();
  }

  async loadStats() {
    if (!this.startDate || !this.endDate) {
      return;
    }

    const activities = await this.activityService.getByDate(this.startDate, this.endDate);

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
}
