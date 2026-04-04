import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { IDictionary } from 'src/app/db/models/dictionary';
import { TermService } from 'src/app/services/term.service';
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
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private dictionaryService = inject(DictionaryService);
  private termService = inject(TermService);
  private translate = inject(TranslateService);
  private formBuilder = inject(FormBuilder);

  private dictionaries: IDictionary[] = [];

  activities: IActivity[] = [];
  public filterForm: ModelFormGroup<FilterForm>;
  public suggestions: Selectable<CommonTerm>[] = [];
  minutesChartData: ChartConfiguration<'bar'>['data'] | undefined = undefined;
  amountChartData: ChartConfiguration<'bar'>['data'] | undefined = undefined;
  totalAmount: number = 0;
  totalDuration: number = 0;
  averageAmountPerDay: number = 0;
  averageTimePerTime: number = 0;
  averageTimePerDay: number = 0;
  private initialized = false;
  private lastLoadedState: string | null = null;

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

  async ionViewDidEnter() {
    this.lastLoadedState = null;
    this.dictionaries = await this.dictionaryService.getAll();
    const savedPeriod = localStorage.getItem('stats-term-date-period');
    const savedTerm = localStorage.getItem('stats-term-term');

    if (savedPeriod) {
      this.filterForm.patchValue({ datePeriod: JSON.parse(savedPeriod) }, { emitEvent: false });
      await this.loadSuggestions();
    }

    if (savedTerm) {
      const term = JSON.parse(savedTerm) as CommonTerm;
      const found = this.suggestions.find(s => s.item.termId === term.termId && s.item.type === term.type);
      if (found) {
        this.filterForm.patchValue({ term: found.item }, { emitEvent: false });
      }
    }

    this.initialized = true;

    if (this.filterForm.valid) {
      this.setChartData();
    }
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

    const allDbActions = await this.actionService.getAllUnhidden();
    const actions = allDbActions.map((action) => ({
      name: action.name,
      type: 'action',
      termId: action.id,
    } as CommonTerm));

    const allDbTags = await this.tagService.getAllUnhidden();
    const tags = allDbTags.map((tag) => ({
      name: tag.name,
      type: 'tag',
      termId: tag.id,
    } as CommonTerm));

    const allDbTerms = await this.termService.getAllUnhidden();
    const activityTerms = allDbTerms.map((term) => ({
      name: term.name,
      type: 'term',
      termId: term.id,
    } as CommonTerm));

    const allTerms = filterUniqueElements([
      ...actions,
      ...tags,
      ...activityTerms,
    ]);

    const termDictionaryId: Record<number, number> = {};
    allDbTerms.forEach(t => { termDictionaryId[t.id] = t.dictionaryId; });

    this.suggestions = allTerms.map((term, index) => {
      let subtitle: string;
      if (term.type === 'term') {
        const dictId = termDictionaryId[term.termId];
        const dict = this.dictionaries.find(d => d.id === dictId);
        subtitle = dict ? this.translate.instant(dict.name) : this.translate.instant('TK_TERM');
      } else {
        subtitle = this.translate.instant('TK_' + term.type.toUpperCase());
      }
      return { num: index, title: term.name, subtitle, item: term };
    });
  }

  setChartData() {
    if (!this.filterForm.valid || !this.filterForm.value.datePeriod || !this.filterForm.value.term) {
      return;
    }

    const term: CommonTerm = this.filterForm.value.term;
    const { startDate, endDate } = this.filterForm.value.datePeriod;

    const currentState = `${startDate}|${endDate}|${term.type}:${term.termId}`;
    if (currentState === this.lastLoadedState) {
      return;
    }
    this.lastLoadedState = currentState;

    if (this.initialized) {
      localStorage.setItem('stats-term-date-period', JSON.stringify(this.filterForm.value.datePeriod));
      localStorage.setItem('stats-term-term', JSON.stringify(term));
    }

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

    if (term.type == 'term') {
      return activity.terms.some((t) => t.id === term.termId);
    }

    return false;
  }

  getTimeString(minutes: number) {
    return getTimeString(this.translate, minutes);
  }
}
