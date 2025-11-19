import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TagService } from 'src/app/services/tag.service';
import { ITag } from 'src/app/db/models/tag';
import { ActivatedRoute } from '@angular/router';
import { IActivity } from 'src/app/db/models/activity';
import { ActivityService } from 'src/app/services/activity.service';
import { addDays, format } from 'date-fns';
import { Time } from 'src/app/Time';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';
import { BackButtonComponent } from "src/app/components/back-button/back-button.component";
import { getTimeString } from 'src/app/functions/string';

@Component({
  selector: 'app-tag-view',
  templateUrl: './tag-view.page.html',
  styleUrls: ['./tag-view.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, ActivityListComponent, BackButtonComponent]
})
export class TagViewPage {
  private route = inject(ActivatedRoute);
  private tagService = inject(TagService);
  private activityService = inject(ActivityService);
  private translate = inject(TranslateService);

  tagId: number;
  tag?: ITag;
  totalTimeMinutes: number = 0;
  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
  }[] = [];

  constructor() {
    this.tagId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    const tag = await this.tagService.getById(this.tagId);

    if (tag) {
      this.tag = tag;
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
      (activity) => activity.tags.find((tag) => tag.id == this.tagId),
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
    return getTimeString(this.translate, minutes);
  }
}
