import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { addDays, format } from 'date-fns';
import { MetricService } from 'src/app/services/metric.service';
import { ActivityService } from 'src/app/services/activity.service';
import { IMetric } from 'src/app/db/models/metric';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-metric-view',
  templateUrl: './metric-view.page.html',
  styleUrls: ['./metric-view.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BaseChartDirective, BackButtonComponent],
})
export class MetricViewPage {
  private route = inject(ActivatedRoute);
  private metricService = inject(MetricService);
  private activityService = inject(ActivityService);
  private translate = inject(TranslateService);

  metricId: number;
  metric?: IMetric;
  chartData?: ChartConfiguration<'line'>['data'];
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: {
      y: { beginAtZero: false },
    },
  };

  constructor() {
    this.metricId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.metric = await this.metricService.getById(this.metricId);
    await this.loadChart();
  }

  async loadChart() {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(addDays(new Date(), -6), 'yyyy-MM-dd');

    const activities = await this.activityService.getByDate(startDate, endDate);

    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      dates.push(format(addDays(new Date(), -i), 'yyyy-MM-dd'));
    }

    const dataPoints = dates.map((date) => {
      const dayActivities = activities.filter((a) => a.date === date);
      const records = dayActivities
        .flatMap((a) => a.metricRecords)
        .filter((r) => r.metricId === this.metricId && r.value != null);

      if (!records.length) return null;

      const avg = records.reduce((sum, r) => sum + r.value, 0) / records.length;
      return avg;
    });

    const metricName = this.metric?.name
      ? this.translate.instant(this.metric.name)
      : '';

    this.chartData = {
      labels: dates,
      datasets: [
        {
          data: dataPoints as (number | null)[],
          label: metricName,
          spanGaps: true,
        },
      ],
    };
  }
}
