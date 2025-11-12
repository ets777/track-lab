import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonTextarea, IonList, IonIcon } from '@ionic/angular/standalone';
import { ActivityService } from 'src/app/services/activity.service';
import { Time } from 'src/app/Time';
import { addDays, format } from 'date-fns';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { MaskitoDirective } from '@maskito/angular';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { maskitoTimeOptionsGenerator } from '@maskito/kit';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';
import { getPartIndex, lowerCaseFirstLetter } from 'src/app/functions/string';
import { actionSuggestions } from './action-suggestions';
import { IActivity } from 'src/app/db/models/activity';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { entitiesToString } from 'src/app/functions/string';
import { ActionService } from 'src/app/services/action.service';
import { tagsValidator } from 'src/app/validators/tags.validator';
import { duplicatedItemsValidator } from 'src/app/validators/duplicated-items.validator';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';

export type ActivityForm = {
    actions: string,
    startTime: string,
    endTime: string,
    comment: string,
    date: string,
    tags: string,
};

@Component({
    selector: 'app-activity-form',
    templateUrl: './activity-form.component.html',
    styleUrls: ['./activity-form.component.scss'],
    imports: [IonIcon, IonList, IonTextarea, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective, ValidationErrorDirective, TagInputComponent],
})
export class ActivityFormComponent {
    @Input() activity?: IActivity;

    @ViewChild('actionsInput') actionInput!: IonInput;
    actionInputCaretPosition = 0;
    actionInputText = '';

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
            tags: ['', tagsValidator],
        });
        this.setCurrentTime();

        setInterval(() => {
            this.setCurrentTime();
        }, 5000);
    }

    async ngOnInit() {
        await this.fetchAllSuggestions();

        if (this.activity) {
            this.setActivityData(this.activity);
        } else {
            await this.setDefaultData();
        }
    }

    async fetchAllSuggestions() {
        const actions = await this.actionService.getAll();
        this.allActionSuggestions = this.allActionSuggestions.map(
            (suggestion) => lowerCaseFirstLetter(this.translate.instant(suggestion))
        );
        this.allActionSuggestions.unshift(...actions.map((action) => action.name));
        this.allActionSuggestions = [...new Set(this.allActionSuggestions)];
    }

    setCurrentTime() {
        this.currentTime = new Time().toString().slice(0, 5);
    }

    getDefaultData() {
        const currentDate = format(new Date(), 'yyyy-MM-dd');

        return {
            actions: '',
            startTime: this.currentTime,
            endTime: this.currentTime,
            comment: '',
            date: currentDate,
            tags: '',
        };
    }

    async setDefaultData() {
        const defaultData = this.getDefaultData();
        const lastActivityData = await this.getLastActivityData();

        this.activityForm.patchValue({
            ...defaultData,
            ...lastActivityData,
        });
    }

    async updateLastActivityData() {
        const lastActivityData = await this.getLastActivityData();

        this.activityForm.patchValue({
            ...lastActivityData,
        });
    }

    async getLastActivityData() {
        const currentDate = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(addDays(new Date(currentDate), -1), 'yyyy-MM-dd');
        const lastActivity = await this.activityService.getLastEnriched();

        if (!lastActivity) {
            return {};
        }

        let startTime = this.currentTime;
        let date = currentDate;

        if (lastActivity.date == currentDate && lastActivity.endTime) {
            startTime = lastActivity.endTime;
        }

        if (
            lastActivity.date
            && yesterday == lastActivity.date
            && lastActivity.endTime
        ) {
            startTime = lastActivity.endTime;

            if (lastActivity.endTime > lastActivity.startTime) {
                date = lastActivity.date;
            }
        }

        return {
            startTime,
            date,
        };
    }

    setActivityData(activity: IActivity) {
        this.activityForm.patchValue({
            actions: entitiesToString(activity.actions),
            startTime: activity.startTime,
            endTime: activity.endTime,
            comment: activity.comment,
            date: activity.date,
            tags: entitiesToString(activity.tags),
        });
    }

    async updateActionCaretAndText(event: any) {
        const indexBefore = getPartIndex(this.actionInputText, this.actionInputCaretPosition);

        this.actionInputText = event.target.value;
        const nativeInput = await this.actionInput.getInputElement();
        this.actionInputCaretPosition = nativeInput.selectionStart ?? 0;
        const indexAfter = getPartIndex(this.actionInputText, this.actionInputCaretPosition);

        if (indexBefore !== indexAfter) {
            this.hideActionSuggestions();
        }
    }

    async onActionsInput(event: any) {
        await this.updateActionCaretAndText(event);

        const parts = this.actionInputText
            .split(',')
            .map((suggestion: string) => suggestion.toLowerCase().trim());

        const currentIndex = getPartIndex(this.actionInputText, this.actionInputCaretPosition);
        const current = parts[currentIndex];

        parts.splice(currentIndex, 1);

        if (current.length > 0) {
            this.filteredActionSuggestions = this.allActionSuggestions
                .filter((suggestion) =>
                    suggestion.toLowerCase().includes(current)
                    && !parts.includes(suggestion.toLowerCase())
                )
                .slice(0, 5);
            this.showActionSuggestions = this.filteredActionSuggestions.length > 0;
        } else {
            this.hideActionSuggestions();
        }
    }

    selectSuggestion(suggestion: string) {
        const actionsText = this.activityForm.get('actions')?.value;

        if (!actionsText) {
            return;
        }

        const currentIndex = getPartIndex(actionsText, this.actionInputCaretPosition);
        let parts = actionsText.split(',') ?? [];

        if (!parts.length) {
            return;
        }

        parts[currentIndex] = ' ' + suggestion;
        this.activityForm.patchValue({
            actions: parts.join(',').trim(),
        });

        this.hideActionSuggestions();
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
