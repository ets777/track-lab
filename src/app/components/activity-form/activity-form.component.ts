import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonIcon, IonText, IonTextarea, IonRange, IonPopover, IonList, IonCheckbox } from '@ionic/angular/standalone';
import { ActivityService } from 'src/app/services/activity.service';
import { Time } from 'src/app/Time';
import { addDays, format } from 'date-fns';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { MaskitoDirective } from '@maskito/angular';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { maskitoTimeOptionsGenerator } from '@maskito/kit';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';
import { lowerCaseFirstLetter } from 'src/app/functions/string';
import { actionSuggestions } from './action-suggestions';
import { IActivity } from 'src/app/db/models/activity';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { actionsToString } from 'src/app/functions/action';
import { ActionService } from 'src/app/services/action.service';

export type ActivityForm = {
  actions: string,
  startTime: string,
  endTime: string,
  comment: string,
  date: string,
  doNotMeasure: boolean,
  mood: number,
  energy: number,
  satiety: number,
  emotions: string,
};

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonCheckbox, IonList, IonPopover, IonRange, IonTextarea, IonIcon, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective]
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

  public activityForm: ModelFormGroup<ActivityForm>;
  private defaultValue: number = 5;

  isTooltipOpen = false;
  tooltipMessage = '';
  tooltipEvent: any;

  filteredSuggestions: string[] = [];
  private allSuggestions = actionSuggestions;
  showSuggestions = false;
  private currentTime: string = '00:00';

  constructor(
    private formBuilder: FormBuilder,
    private activityService: ActivityService,
    private translate: TranslateService,
    private actionService: ActionService,
  ) {
    this.activityForm = this.formBuilder.group({
      actions: ['', Validators.required],
      startTime: ['', [Validators.required, timeFormatValidator]],
      endTime: ['', timeFormatValidator],
      comment: [''],
      date: ['', [Validators.required, dateFormatValidator]],
      doNotMeasure: [false],
      mood: [this.defaultValue],
      energy: [this.defaultValue],
      satiety: [this.defaultValue],
      emotions: [''],
    });
    this.setCurrentTime();

    setInterval(() => {
      this.setCurrentTime();
    }, 5000);
  }

  async ngOnInit() {
    const actions = await this.actionService.getAll();
    this.allSuggestions = this.allSuggestions.map((suggestion) => lowerCaseFirstLetter(this.translate.instant(suggestion)))
    this.allSuggestions.unshift(...actions.map((action) => action.name));
    this.allSuggestions = [...new Set(this.allSuggestions)];

    if (this.activity) {
      this.setActivityData(this.activity);
    } else {
      await this.setDefaultData();
    }

    this.activityForm.get('doNotMeasure')
      ?.valueChanges
      .subscribe((value) => {
        if (value) {
          this.activityForm.patchValue({
            mood: null,
            energy: null,
            satiety: null,
          });
        } else {
          this.activityForm.patchValue({
            mood: this.defaultValue,
            energy: this.defaultValue,
            satiety: this.defaultValue,
          });
        }
      });
  }

  setCurrentTime() {
    this.currentTime = new Time().toString().slice(0, 5);
  }

  async setDefaultData(): Promise<void> {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(addDays(new Date(currentDate), -1), 'yyyy-MM-dd');
    const lastActivity = await this.activityService.getLast();

    let startTime = this.currentTime;
    let date = currentDate;

    if (lastActivity?.date == currentDate && lastActivity?.endTime) {
      startTime = lastActivity.endTime;
    }

    if (
      lastActivity?.date
      && yesterday == lastActivity.date
      && lastActivity.endTime
    ) {
      startTime = lastActivity.endTime;

      if (lastActivity.endTime > lastActivity.startTime) {
        date = lastActivity.date;
      }
    }

    const doNotMeasure = lastActivity ? this.getDoNotMeasureValue(lastActivity) : false;

    this.activityForm.patchValue({
      actions: '',
      startTime,
      endTime: this.currentTime,
      comment: '',
      date,
      doNotMeasure,
      mood: !doNotMeasure ? lastActivity?.mood || this.defaultValue : null,
      energy: !doNotMeasure ? lastActivity?.energy || this.defaultValue : null,
      satiety: !doNotMeasure ? lastActivity?.satiety || this.defaultValue : null,
      emotions: '',
    });
  }

  setActivityData(activity: IActivity) {
    this.activityForm.patchValue({
      actions: actionsToString(activity.actions),
      startTime: activity.startTime,
      endTime: activity.endTime,
      comment: activity.comment,
      date: activity.date,
      doNotMeasure: this.getDoNotMeasureValue(activity),
      mood: activity.mood,
      energy: activity.energy,
      satiety: activity.satiety,
      emotions: activity.emotions,
    });
  }

  getDoNotMeasureValue(activity: IActivity) {
    return !activity?.mood || !activity?.energy || !activity?.satiety;
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
    const parts = actionsText
      .split(',')
      .map((suggestion: string) => suggestion.toLowerCase());
    const current = parts.at(-1).trim();
    const entered = parts.slice(0, parts.length - 1);

    if (current.length > 0) {
      this.filteredSuggestions = this.allSuggestions
        .filter((suggestion) =>
          suggestion.toLowerCase().startsWith(current)
          && !entered.includes(suggestion.toLowerCase())
        )
        .slice(0, 5);
      this.showSuggestions = this.filteredSuggestions.length > 0;
    } else {
      this.showSuggestions = false;
    }
  }

  selectSuggestion(suggestion: string) {
    let parts = this.activityForm.get('actions')?.value?.split(',') ?? [];

    if (!parts.length) {
      return;
    }

    parts[parts.length - 1] = ' ' + suggestion;
    this.activityForm.patchValue({
      actions: parts.join(',').trim(),
    });

    this.showSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => (this.showSuggestions = false), 200);
  }

  isCurrentTime(time: string) {
    return this.currentTime == time;
  }

  updateEndTime(event: Event) {
    event.preventDefault();

    this.activityForm.patchValue({
      endTime: this.currentTime,
    });
  }
}
