import { Component, inject } from '@angular/core';
import { IonHeader, IonContent, IonToolbar, IonTitle } from '@ionic/angular/standalone';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { StatsSkeletonComponent } from 'src/app/skeletons/stats/stats-skeleton.component';
import { StatsContentComponent } from 'src/app/components/stats-content/stats-content.component';
import { MetricService } from 'src/app/services/metric.service';
import { ActivityService } from 'src/app/services/activity.service';
import { IMetric } from 'src/app/db/models/metric';
import { IActivity } from 'src/app/db/models/activity';
import { DatePeriod } from 'src/app/types/date-period';
import { addLocalDays, addLocalMonths, todayLocal } from 'src/app/functions/date';
import { parseStoredJson } from 'src/app/functions/storage';

@Component({
  selector: 'app-stats',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, TranslateModule, StatsSkeletonComponent, StatsContentComponent, NavButtonComponent],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private metricService = inject(MetricService);
  private activityService = inject(ActivityService);
  private navigationService = inject(NavigationService);

  isLoading = true;
  allMetrics: IMetric[] = [];
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
      return parseStoredJson<DatePeriod>(savedPeriodJson);
    }

    const periodType = (periodTypeStr ?? 'week') as 'week' | 'month';
    const savedPeriod = parseStoredJson<DatePeriod>(savedPeriodJson);
    const endDate = savedPeriod?.endDate ?? todayLocal();

    const startDate = periodType === 'month'
      ? addLocalMonths(endDate, -1)
      : addLocalDays(endDate, -6);

    return { startDate, endDate };
  }
}
