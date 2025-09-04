import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IActivity } from 'src/app/db';
import { ActivityService } from 'src/app/services/activity.service';
import { Time } from 'src/app/Time';
import { format } from 'date-fns';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule]
})
export class ActivityFormComponent {
  @Input() activity?: IActivity;

  public activityForm: FormGroup;
  private defaultValue: number = 5;

  constructor(
    private formBuilder: FormBuilder,
    private activityService: ActivityService,
  ) {
    this.activityForm = this.formBuilder.group({
      actions: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: [''],
      comment: [''],
      date: ['', Validators.required],
      mood: [this.defaultValue],
      energy: [this.defaultValue],
      satiety: [this.defaultValue],
      emotions: [''],
    });
  }

  async ngOnInit() {
    if (this.activity) {
      this.setActivityData(this.activity);
    } else {
      await this.setDefaultData();
    }
  }

  async setDefaultData(): Promise<void> {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const currentTime = new Time().toString().slice(0, 5);
    const lastActivity = await this.activityService.getLast(currentDate);
    const startFromCurrentTime = !lastActivity?.endTime || lastActivity.date !== currentDate;

    this.activityForm.patchValue({
      actions: '',
      startTime: startFromCurrentTime ? currentTime : lastActivity?.endTime,
      endTime: currentTime,
      comment: '',
      date: currentDate,
      mood: lastActivity?.mood || this.defaultValue,
      energy: lastActivity?.energy || this.defaultValue,
      satiety: lastActivity?.satiety || this.defaultValue,
      emotions: '',
    });
  }

  setActivityData(activity: IActivity) {
    this.activityForm.patchValue({
      actions: activity.actions,
      startTime: activity.startTime,
      endTime: activity.endTime,
      comment: activity.comment,
      date: activity.date,
      mood: activity.mood,
      energy: activity.energy,
      satiety: activity.satiety,
      emotions: activity.emotions,
    });
  }
}
