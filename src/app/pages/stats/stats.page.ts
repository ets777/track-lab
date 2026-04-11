import { Component, inject } from '@angular/core';
import { IonHeader, IonContent, IonToolbar, IonTitle, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { StatsSkeletonComponent } from 'src/app/skeletons/stats/stats-skeleton.component';
import { StatsContentComponent } from 'src/app/components/stats-content/stats-content.component';
import { MetricService } from 'src/app/services/metric.service';
import { ActivityService } from 'src/app/services/activity.service';
import { IMetric } from 'src/app/db/models/metric';
import { IActivity } from 'src/app/db/models/activity';
import { DatePeriod } from 'src/app/types/date-period';
import { addDays, addMonths, format } from 'date-fns';

@Component({
  selector: 'app-stats',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, TranslateModule, StatsSkeletonComponent, StatsContentComponent],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private metricService = inject(MetricService);
  private activityService = inject(ActivityService);

  isLoading = true;
  allMetrics: IMetric[] = [];
  savedPeriod: string | null = null;
  savedMetrics: string | null = null;
  initialActivities: IActivity[] = [];
  initialPeriod: DatePeriod | null = null;

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
