import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonTextarea, IonRange, IonList, IonCheckbox, IonIcon } from '@ionic/angular/standalone';
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
import { entitiesToString } from 'src/app/functions/string';
import { ActionService } from 'src/app/services/action.service';
import { duplicatedItemsValidator } from 'src/app/validators/duplicated-items.validator';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { TagInputComponent } from '../tag-input/tag-input.component';

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
  tags: string,
};

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonIcon, IonCheckbox, IonList, IonRange, IonTextarea, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective, ValidationErrorDirective, TagInputComponent]
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

  filteredActionSuggestions: string[] = [];
  private allActionSuggestions = actionSuggestions;
  showActionSuggestions = false;
  
  private currentTime: string = '00:00';

  constructor(
    private formBuilder: FormBuilder,
    private activityService: ActivityService,
    private translate: TranslateService,
    private actionService: ActionService,
  ) {
    this.activityForm = this.formBuilder.group({
      actions: ['', [Validators.required, duplicatedItemsValidator]],
      startTime: ['', [Validators.required, timeFormatValidator]],
      endTime: ['', timeFormatValidator],
      comment: [''],
      date: ['', [Validators.required, dateFormatValidator]],
      doNotMeasure: [false],
      mood: [this.defaultValue],
      energy: [this.defaultValue],
      satiety: [this.defaultValue],
      emotions: ['', duplicatedItemsValidator],
      tags: [''],
    });
    this.setCurrentTime();

    setInterval(() => {
      this.setCurrentTime();
    }, 5000);
  }

  async ngOnInit() {
    const actions = await this.actionService.getAll();
    this.allActionSuggestions = this.allActionSuggestions.map(
      (suggestion) => lowerCaseFirstLetter(this.translate.instant(suggestion))
    );
    this.allActionSuggestions.unshift(...actions.map((action) => action.name));
    this.allActionSuggestions = [...new Set(this.allActionSuggestions)];

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
      tags: '',
    });
  }

  setActivityData(activity: IActivity) {
    this.activityForm.patchValue({
      actions: entitiesToString(activity.actions),
      startTime: activity.startTime,
      endTime: activity.endTime,
      comment: activity.comment,
      date: activity.date,
      doNotMeasure: this.getDoNotMeasureValue(activity),
      mood: activity.mood,
      energy: activity.energy,
      satiety: activity.satiety,
      emotions: activity.emotions,
      tags: entitiesToString(activity.tags),
    });
  }

  getDoNotMeasureValue(activity: IActivity) {
    return !activity?.mood || !activity?.energy || !activity?.satiety;
  }

  onActionsInput(event: any) {
    const actionsText = event.target.value;
    const parts = actionsText
      .split(',')
      .map((suggestion: string) => suggestion.toLowerCase().trim());
    const current = parts.at(-1);
    const entered = parts.slice(0, parts.length - 1);

    if (current.length > 0) {
      this.filteredActionSuggestions = this.allActionSuggestions
        .filter((suggestion) =>
          suggestion.toLowerCase().startsWith(current)
          && !entered.includes(suggestion.toLowerCase())
        )
        .slice(0, 5);
      this.showActionSuggestions = this.filteredActionSuggestions.length > 0;
    } else {
      this.showActionSuggestions = false;
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

    this.showActionSuggestions = false;
  }

  hideActionSuggestions() {
    setTimeout(() => (this.showActionSuggestions = false), 200);
  }

  isCurrentTime(time: string) {
    return this.currentTime == time;
  }

  updateEndTime(event: Event) {
    event.preventDefault();

    this.activityForm.patchValue({
      endTime: this.currentTime,
    });

    this.activityForm.get('endTime')?.markAsUntouched();
  }
}
