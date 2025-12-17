import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { SelectSearchComponent } from "src/app/form-elements/select-search/select-search.component";
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { DatePeriod } from 'src/app/types/date-period';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { IActivity } from 'src/app/db/models/activity';
import { getActivityDurationMinutes } from 'src/app/functions/activity';
import { getTimeString } from 'src/app/functions/string';
import { addDays, format } from 'date-fns';
import { Selectable, CommonTerm } from 'src/app/types/selectable';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { filterUniqueElements } from 'src/app/functions/term';

export type FilterForm = {
  term: CommonTerm;
  datePeriod: DatePeriod;
};

@Component({
  selector: 'app-stats-term',
  templateUrl: './stats-term.page.html',
  styleUrls: ['./stats-term.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule, SelectSearchComponent, ValidationErrorDirective, ReactiveFormsModule, DatePeriodInputComponent, BaseChartDirective],
})
export class StatsTermPage {
  private activityService = inject(ActivityService);
  private translate = inject(TranslateService);
  private formBuilder = inject(FormBuilder);

  activities: IActivity[] = [];
  public filterForm: ModelFormGroup<FilterForm>;
  public suggestions: Selectable<CommonTerm>[] = [];
  minutesChartData!: ChartConfiguration<'bar'>['data'];
  amountChartData!: ChartConfiguration<'bar'>['data'];
  totalAmount: number = 0;
  totalDuration: number = 0;
  averageAmountPerDay: number = 0;
  averageTimePerTime: number = 0;
  averageTimePerDay: number = 0;

  constructor() {
    this.filterForm = this.formBuilder.group({
      datePeriod: [null as DatePeriod | null, Validators.required],
      term: [null as CommonTerm | null, Validators.required],
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
    if (!this.filterForm.value.datePeriod) {
      return;
    }

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
        termId: action.id,
      } as CommonTerm));

    const activityTags = this.activities
      .flatMap((activity) => activity.tags)
      .filter((tag) => !tag.isHidden)
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
        termId: tag.id,
      } as CommonTerm));

    const actionTags = this.activities
      .flatMap((activity) => activity.actions)
      .flatMap((action) => action.tags)
      .filter((tag) => !tag.isHidden)
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
        termId: tag.id,
      } as CommonTerm));

    const allTerms = filterUniqueElements([
      ...actions,
      ...activityTags,
      ...actionTags,
    ]);

    this.suggestions = allTerms.map((term, index) => ({
      num: index,
      title: term.name,
      subtitle: this.translate.instant('TK_' + term.type.toUpperCase()),
      item: term,
    }));
  }

  setChartData() {
    if (!this.filterForm.value.datePeriod || !this.filterForm.value.term) {
      return;
    }

    const term: CommonTerm = this.filterForm.value.term;
    
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
              (activity) => this.hasTerm(activity, term),
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

  hasTerm(activity: IActivity, term: CommonTerm) {
    if (term.type == 'action') {
      return activity.actions.some(
        (action) => action.name == term.name,
      );
    }

    if (term.type == 'tag') {
      return activity.tags.some(
        (tag) => tag.name == term.name,
      ) || activity.actions.some(
        (action) => action.tags.some(
          (tag) => tag.name == term.name,
        ),
      );
    }

    return false;
  }

  getTimeString(minutes: number) {
    return getTimeString(this.translate, minutes);
  }
}
