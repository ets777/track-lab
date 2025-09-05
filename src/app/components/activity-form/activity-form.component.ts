import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonIcon, IonText, IonTextarea, IonRange, IonPopover } from '@ionic/angular/standalone';
import { IActivity } from 'src/app/db';
import { ActivityService } from 'src/app/services/activity.service';
import { Time } from 'src/app/Time';
import { format } from 'date-fns';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { MaskitoDirective } from '@maskito/angular';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { maskitoTimeOptionsGenerator } from '@maskito/kit';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonPopover, IonRange, IonTextarea, IonText, IonIcon, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective]
})
export class ActivityFormComponent {
  @Input() activity?: IActivity;

  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();
  protected readonly timeMask: MaskitoOptions = maskitoTimeOptionsGenerator({
    mode: 'HH:MM',
  });

  public activityForm: FormGroup;
  private defaultValue: number = 5;

  isTooltipOpen = false;
  tooltipMessage = '';
  tooltipEvent: any;

  constructor(
    private formBuilder: FormBuilder,
    private activityService: ActivityService,
    private translate: TranslateService,
  ) {
    this.activityForm = this.formBuilder.group({
      actions: ['', Validators.required],
      startTime: ['', [Validators.required, timeFormatValidator]],
      endTime: ['', timeFormatValidator],
      comment: [''],
      date: ['', [Validators.required, dateFormatValidator]],
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

  openTooltip(ev: Event, fieldName: string) {
    const errors = this.activityForm.get(fieldName)?.errors;
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
}
