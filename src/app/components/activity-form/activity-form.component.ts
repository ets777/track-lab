import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonIcon, IonText, IonTextarea, IonRange, IonPopover, IonList } from '@ionic/angular/standalone';
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
import { lowerCaseFirstLetter } from 'src/app/functions/string';
import { actionSuggestions } from './action-suggestions';

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonList, IonPopover, IonRange, IonTextarea, IonIcon, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective]
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

  filteredSuggestions: string[] = [];
  private allSuggestions = actionSuggestions;
  showSuggestions = false;

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

  onActionsInput(event: any) {
    const actionsText = event.target.value;
    const parts = actionsText.split(',');
    const current = parts.at(-1).trim();

    if (current.length > 0) {
      this.filteredSuggestions = this.allSuggestions
        .map((suggestion) => lowerCaseFirstLetter(this.translate.instant(suggestion)))
        .filter((suggestion) =>
          suggestion.toLowerCase().startsWith(current.toLowerCase())
        )
        .slice(0, 5);
      this.showSuggestions = this.filteredSuggestions.length > 0;
    } else {
      this.showSuggestions = false;
    }
  }

  selectSuggestion(suggestion: string) {
    let parts = this.activityForm.get('actions')?.value.split(',');
    parts[parts.length - 1] = ' ' + suggestion;
    this.activityForm.patchValue({
      actions: parts.join(',').trim(),
    });

    this.showSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => (this.showSuggestions = false), 200); // delay to allow click
  }
}
