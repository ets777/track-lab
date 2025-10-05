import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { IAction } from 'src/app/db/models/action';
import { IActivity } from 'src/app/db/models/activity';
import { ActionService } from 'src/app/services/action.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';
import { Time } from 'src/app/Time';
import { addDays, format } from 'date-fns';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-action-view',
  templateUrl: './action-view.page.html',
  styleUrls: ['./action-view.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, ActivityListComponent, BackButtonComponent],
})
export class ActionViewPage implements OnInit {
  actionId: number;
  action?: IAction;
  totalTimeMinutes: number = 0;
  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
  }[] = [];

  constructor(
    private route: ActivatedRoute,
    private actionService: ActionService,
    private activityService: ActivityService,
    private translate: TranslateService,
  ) {
    this.actionId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    const action = await this.actionService.getEnriched(this.actionId);

    if (action) {
      this.action = action;
    } else {
      // show an error
    }
    await this.setActivitiesData();
  }

  async setActivitiesData() {
    const activities = await this.activityService.getByDate(
      format(addDays(new Date(), -6), 'yyyy-MM-dd'),
      format(new Date(), 'yyyy-MM-dd'),
    );
    const dates = [...new Set(activities.map((activity) => activity.date))]
      .sort((a, b) => new Date(a).getMilliseconds() - new Date(b).getMilliseconds())
      .reverse();

    this.activities = activities.filter(
      (activity) => activity.actions.find((action) => action.id == this.actionId),
    );

    this.activitiesGroupedByDate = dates
      .map((date) => {
        const activitiesAtDate = this.activities.filter((activity) => activity.date == date);
        return {
          date: date,
          activities: activitiesAtDate,
        };
      })
      .filter((day) => day.activities.length);

    const totalTimeSeconds = dates
      .flatMap((date) => this.activities.filter((activity) => activity.date == date))
      .reduce((sum, activity) => {
        let duration = new Time(activity.endTime).valueOf() - new Time(activity.startTime).valueOf();
        if (duration < 0) {
          duration += 24 * 60 * 60;
        }

        return sum + duration;
      }, 0);

    this.totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
  }

  getTimeString(minutes: number) {
    const minuteUnit = this.translate.instant('TK_M').toLowerCase();
    const hourUnit = this.translate.instant('TK_H').toLowerCase();

    if (minutes < 60) {
      return `${minutes} ${minuteUnit}.`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainder = Math.floor(minutes % 60);

      return `${hours} ${hourUnit}. ${remainder} ${minuteUnit}.`;
    }
  }
}
