import { Component, inject } from '@angular/core';
import { IonHeader, IonContent, IonToolbar, IonTitle, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { NavigationService } from 'src/app/services/navigation.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { StatsSkeletonComponent } from 'src/app/skeletons/stats/stats-skeleton.component';
import { StatsContentComponent } from 'src/app/components/stats-content/stats-content.component';
import { MetricService } from 'src/app/services/metric.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ListService } from 'src/app/services/list.service';
import { ItemService } from 'src/app/services/item.service';
import { RuleService } from 'src/app/services/rule.service';
import { IMetric } from 'src/app/db/models/metric';
import { IActivity } from 'src/app/db/models/activity';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IList } from 'src/app/db/models/list';
import { IItem } from 'src/app/db/models/item';
import { IRule } from 'src/app/db/models/rule';
import { DatePeriod } from 'src/app/types/date-period';
import { addDays, addMonths, format } from 'date-fns';

@Component({
  selector: 'app-stats',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, TranslateModule, StatsSkeletonComponent, StatsContentComponent, BackButtonComponent],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private metricService = inject(MetricService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private listService = inject(ListService);
  private itemService = inject(ItemService);
  private ruleService = inject(RuleService);
  private navigationService = inject(NavigationService);

  isLoading = true;
  allMetrics: IMetric[] = [];
  allActions: IActionDb[] = [];
  allTags: ITag[] = [];
  allLists: IList[] = [];
  allItems: IItem[] = [];
  allRules: IRule[] = [];
  savedPeriod: string | null = null;
  savedMetrics: string | null = null;
  initialActivities: IActivity[] = [];
  initialPeriod: DatePeriod | null = null;

  get showBackButton(): boolean {
    return this.navigationService.fromDashboard;
  }

  ionViewWillEnter() {
    this.isLoading = true;
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));

    this.allMetrics = await this.metricService.getAll();
    this.allActions = await this.actionService.getAll() as IActionDb[];
    this.allTags = await this.tagService.getAll() as ITag[];
    this.allLists = await this.listService.getAll();
    this.allItems = await this.itemService.getAll() as IItem[];
    this.allRules = await this.ruleService.getAll();

    this.savedPeriod = localStorage.getItem('stats-date-period');
    this.savedMetrics = localStorage.getItem('stats-metrics');

    const period = this.computeInitialPeriod('stats', this.savedPeriod);
    if (period) {
      this.initialActivities = await this.activityService.getByDate(period.startDate, period.endDate);
      this.initialPeriod = period;
    } else {
      this.initialActivities = [];
      this.initialPeriod = null;
    }

    this.isLoading = false;
  }

  private computeInitialPeriod(storageKey: string, savedPeriodJson: string | null): DatePeriod | null {
    const periodTypeStr = localStorage.getItem(`${storageKey}-period-type`);

    if (periodTypeStr === 'null') {
      return savedPeriodJson ? JSON.parse(savedPeriodJson) : null;
    }

    const periodType = (periodTypeStr ?? 'week') as 'week' | '2weeks' | 'month';
    const savedPeriod = savedPeriodJson ? JSON.parse(savedPeriodJson) as DatePeriod : null;
    const endDate = savedPeriod?.endDate ?? format(new Date(), 'yyyy-MM-dd');

    let startDate: string;
    if (periodType === '2weeks') {
      startDate = format(addDays(new Date(endDate), -13), 'yyyy-MM-dd');
    } else if (periodType === 'month') {
      startDate = format(addMonths(new Date(endDate), -1), 'yyyy-MM-dd');
    } else {
      startDate = format(addDays(new Date(endDate), -6), 'yyyy-MM-dd');
    }

    return { startDate, endDate };
  }
}
