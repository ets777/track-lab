import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { Selectable, SelectSearchComponent } from "src/app/form-elements/select-search/select-search.component";
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { DatePeriod } from 'src/app/types/date-period';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { IActivity } from 'src/app/db/models/activity';
import { getActivityDurationMinutes } from 'src/app/functions/activity';
import { getTimeString } from 'src/app/functions/string';
import { addDays, format } from 'date-fns';

type LibraryItem = {
    name: string;
    type: ('action' | 'tag');
};

export type FilterForm = {
    libraryItem: LibraryItem;
    datePeriod: DatePeriod;
};

@Component({
    selector: 'app-library-item-stats',
    templateUrl: './library-item-stats.page.html',
    styleUrls: ['./library-item-stats.page.scss'],
    imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule, SelectSearchComponent, ValidationErrorDirective, ReactiveFormsModule, DatePeriodInputComponent, BaseChartDirective],
})
export class LibraryItemStatsPage {
    activities: IActivity[] = [];
    public libraryItems: LibraryItem[] = [];
    public filterForm: FormGroup;
    public suggestions: Selectable<LibraryItem>[] = [];
    minutesChartData!: ChartConfiguration<'bar'>['data'];
    amountChartData!: ChartConfiguration<'bar'>['data'];
    totalAmount: number = 0;
    totalDuration: number = 0;
    averageAmountPerDay: number = 0;
    averageTimePerTime: number = 0;
    averageTimePerDay: number = 0;

    constructor(
        private activityService: ActivityService,
        private translate: TranslateService,
        private formBuilder: FormBuilder,
    ) {
        this.filterForm = this.formBuilder.group({
            datePeriod: [null, Validators.required],
            libraryItem: [null, Validators.required],
        });

        this.filterForm.valueChanges.subscribe(() => {
            if (this.filterForm.valid) {
                this.setChartData();
            }
        });

        this.filterForm.get('datePeriod')?.valueChanges.subscribe(async () => {
            // wait until Angular syncs parent form
            await Promise.resolve();

            if (this.filterForm.controls['datePeriod'].valid) {
                await this.loadSuggestions();
            }
        });
    }

    async loadSuggestions() {
        const { startDate, endDate } = this.filterForm.value.datePeriod;

        if (!startDate || !endDate) {
            return;
        }

        this.activities = await this.activityService.getByDate(startDate, endDate);

        const actions = this.activities
            .flatMap((activity) => activity.actions)
            .filter((action) => !action.isHidden)
            .map((action) => ({
                name: action.name,
                type: 'action',
            } as LibraryItem));

        const activityTags = this.activities
            .flatMap((activity) => activity.tags)
            .filter((tag) => !tag.isHidden)
            .map((tag) => ({
                name: tag.name,
                type: 'tag',
            } as LibraryItem));

        const actionTags = this.activities
            .flatMap((activity) => activity.actions)
            .flatMap((action) => action.tags)
            .filter((tag) => !tag.isHidden)
            .map((tag) => ({
                name: tag.name,
                type: 'tag',
            } as LibraryItem));

        this.libraryItems = this.filterUniqueElements([
            ...actions,
            ...activityTags,
            ...actionTags,
        ]);

        this.suggestions = this.libraryItems.map((item, index) => ({
            num: index,
            title: item.name,
            subtitle: this.translate.instant('TK_' + item.type.toUpperCase()),
            item,
        }));
    }

    setChartData() {
        const libraryItem: LibraryItem = this.filterForm.value.libraryItem;
        const { startDate, endDate } = this.filterForm.value.datePeriod;

        const dates: string[] = [];
        let i = 0;

        while (!dates.includes(endDate)) {
            dates.push(format(addDays(new Date(startDate), i), 'yyyy-MM-dd'));

            i++;

            if (i > 31) {
                break;
            }
        }

        const activitiesGroupedByDate = dates.map(
            (date) => this.activities.filter((activity) => activity.date == date),
        );
        let durationMinutes: number[] = [];
        let amount: number[] = [];
        let averages: number[] = [];

        const result = activitiesGroupedByDate
            .map(
                (activities) => {
                    const filteredActivities = activities
                        .filter(
                            (activity) => this.hasLibraryItem(activity, libraryItem),
                        );

                    const totalMinutes = filteredActivities.reduce((sum, curr) => sum += getActivityDurationMinutes(curr), 0);

                    return {
                        durationMinutes: totalMinutes,
                        amount: filteredActivities.length,
                        averages: totalMinutes / filteredActivities.length,
                    };
                }
            );

        durationMinutes = result.map((item) => item.durationMinutes);
        amount = result.map((item) => item.amount);
        averages = result.map((item) => item.averages);

        this.totalDuration = durationMinutes.reduce((sum, curr) => sum += curr, 0);
        this.averageTimePerDay = this.totalDuration / durationMinutes.length;

        this.totalAmount = amount.reduce((sum, curr) => sum += curr, 0);
        this.averageTimePerTime = this.totalDuration / this.totalAmount;
        this.averageAmountPerDay = this.totalAmount / durationMinutes.length;

        const units = '(' + this.translate.instant('TK_M') + '.)';
        const timeLabel = this.translate.instant('TK_TIME') + ' ' + units;
        const averageTimeLabel = this.translate.instant('TK_AVG') + ' ' + timeLabel.toLowerCase();
        const timesLabel = this.translate.instant('TK_TIMES');

        this.minutesChartData = {
            labels: dates,
            datasets: [
                { data: durationMinutes, label: timeLabel },
                { data: averages, label: averageTimeLabel },
            ]
        };

        this.amountChartData = {
            labels: dates,
            datasets: [
                { data: amount, label: timesLabel },
            ]
        };
    }

    hasLibraryItem(activity: IActivity, libraryItem: LibraryItem) {
        if (libraryItem.type == 'action') {
            return activity.actions.some(
                (action) => action.name == libraryItem.name,
            );
        }

        if (libraryItem.type == 'tag') {
            return activity.tags.some(
                (tag) => tag.name == libraryItem.name,
            ) || activity.actions.some(
                (action) => action.tags.some(
                    (tag) => tag.name == libraryItem.name,
                ),
            );
        }

        return false;
    }

    filterUniqueElements(array: LibraryItem[]) {
        return array.filter(
            (item, index, self) =>
                index === self.findIndex(
                    (t) => t.name === item.name && t.type === item.type
                )
        );
    }

    getTimeString(minutes: number) {
        return getTimeString(this.translate, minutes);
    }
}
