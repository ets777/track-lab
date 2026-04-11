import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ListService } from 'src/app/services/list.service';
import { IList } from 'src/app/db/models/list';
import { ItemService } from 'src/app/services/item.service';
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
import { Selectable, CommonItem } from 'src/app/types/selectable';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { filterUniqueElements } from 'src/app/functions/item';
import { LoadingService } from 'src/app/services/loading.service';
import { StatsSkeletonComponent } from 'src/app/skeletons/stats/stats-skeleton.component';

export type FilterForm = {
  item: CommonItem;
  datePeriod: DatePeriod;
};

@Component({
  selector: 'app-stats-item',
  templateUrl: './stats-item.page.html',
  styleUrls: ['./stats-item.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule, SelectSearchComponent, ValidationErrorDirective, ReactiveFormsModule, DatePeriodInputComponent, BaseChartDirective, StatsSkeletonComponent],
})
export class StatsItemPage {
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private listService = inject(ListService);
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);
  private formBuilder = inject(FormBuilder);
  private loadingService = inject(LoadingService);
  private lists: IList[] = [];

  activities: IActivity[] = [];
  public filterForm: ModelFormGroup<FilterForm>;
  public suggestions: Selectable<CommonItem>[] = [];
  minutesChartData: ChartConfiguration<'bar'>['data'] | undefined = undefined;
  amountChartData: ChartConfiguration<'bar'>['data'] | undefined = undefined;
  totalAmount: number = 0;
  totalDuration: number = 0;
  averageAmountPerDay: number = 0;
  averageTimePerTime: number = 0;
  averageTimePerDay: number = 0;
  private initialized = false;
  isLoading = true;

  constructor() {
    this.filterForm = this.formBuilder.group({
      datePeriod: [null as DatePeriod | null, Validators.required],
      item: [null as CommonItem | null, Validators.required],
    });

    this.filterForm.get('datePeriod')?.valueChanges.subscribe(async () => {
      if (!this.filterForm.controls['datePeriod'].valid) return;
      if (!this.loadingService.tryLock()) return;

      this.loadingService.show('TK_LOADING');
      await new Promise(resolve => setTimeout(resolve));
      try {
        await this.loadSuggestions();
        if (this.filterForm.valid) {
          this.setChartData();
        }
      } finally {
        this.loadingService.hide();
      }
    });
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    try {
      this.lists = await this.listService.getAll();
      const savedPeriod = localStorage.getItem('stats-item-date-period');
      const savedItem = localStorage.getItem('stats-item-item');

      if (savedPeriod) {
        this.filterForm.patchValue({ datePeriod: JSON.parse(savedPeriod) }, { emitEvent: false });
        await this.loadSuggestions();
      }

      if (savedItem) {
        const item = JSON.parse(savedItem) as CommonItem;
        const found = this.suggestions.find(s => s.item.itemId === item.itemId && s.item.type === item.type);
        if (found) {
          this.filterForm.patchValue({ item: found.item }, { emitEvent: false });
        }
      }

      this.initialized = true;

      if (this.filterForm.valid) {
        this.setChartData();
      }
    } finally {
      this.isLoading = false;
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
      itemId: action.id,
    } as CommonItem));

    const allDbTags = await this.tagService.getAllUnhidden();
    const tags = allDbTags.map((tag) => ({
      name: tag.name,
      type: 'tag',
      itemId: tag.id,
    } as CommonItem));

    const allDbItems = await this.itemService.getAllUnhidden();
    const activityItems = allDbItems.map((item) => ({
      name: item.name,
      type: 'item',
      itemId: item.id,
    } as CommonItem));

    const allItems = filterUniqueElements([
      ...actions,
      ...tags,
      ...activityItems,
    ]);

    const itemListId: Record<number, number> = {};
    allDbItems.forEach(t => { itemListId[t.id] = t.listId; });

    this.suggestions = allItems.map((item, index) => {
      let subtitle: string;
      if (item.type === 'item') {
        const listId = itemListId[item.itemId];
        const list = this.lists.find(l => l.id === listId);
        subtitle = list ? this.translate.instant(list.name) : this.translate.instant('TK_ITEM');
      } else {
        subtitle = this.translate.instant('TK_' + item.type.toUpperCase());
      }
      return { num: index, title: item.name, subtitle, item };
    });
  }

  onItemSelected() {
    if (this.filterForm.controls['item'].valid) {
      this.setChartData();
    }
  }


  setChartData() {
    if (!this.filterForm.valid || !this.filterForm.value.datePeriod || !this.filterForm.value.item) {
      return;
    }

    const item: CommonItem = this.filterForm.value.item;
    const { startDate, endDate } = this.filterForm.value.datePeriod;

    if (this.initialized) {
      localStorage.setItem('stats-item-date-period', JSON.stringify(this.filterForm.value.datePeriod));
      localStorage.setItem('stats-item-item', JSON.stringify(item));
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
              (activity) => this.hasItem(activity, item),
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

  hasItem(activity: IActivity, item: CommonItem) {
    if (item.type == 'action') {
      return activity.actions.some(
        (action) => action.name == item.name,
      );
    }

    if (item.type == 'tag') {
      return activity.tags.some(
        (tag) => tag.name == item.name,
      ) || activity.actions.some(
        (action) => action.tags.some(
          (tag) => tag.name == item.name,
        ),
      );
    }

    if (item.type == 'item') {
      return activity.items.some((t) => t.id === item.itemId);
    }

    return false;
  }

  getTimeString(minutes: number) {
    return getTimeString(this.translate, minutes);
  }
}
