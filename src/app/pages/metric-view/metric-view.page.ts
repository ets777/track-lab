import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { MetricService } from 'src/app/services/metric.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionMetricService } from 'src/app/services/action-metric.service';
import { TagMetricService } from 'src/app/services/tag-metric.service';
import { ItemMetricService } from 'src/app/services/item-metric.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IMetric } from 'src/app/db/models/metric';
import { CommonItem } from 'src/app/types/selectable';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-metric-view',
  templateUrl: './metric-view.page.html',
  styleUrls: ['./metric-view.page.scss'],
  imports: [IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BaseChartDirective, BackButtonComponent, DatePeriodInputComponent],
})
export class MetricViewPage {
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private metricService = inject(MetricService);
  private activityService = inject(ActivityService);
  private actionMetricService = inject(ActionMetricService);
  private tagMetricService = inject(TagMetricService);
  private itemMetricService = inject(ItemMetricService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);

  metricId: number;
  metric?: IMetric;
  linkedItem?: CommonItem;
  chartData?: ChartConfiguration<'line'>['data'];
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: false } },
  };
  filterForm = this.formBuilder.group({ datePeriod: [null as any] });

  constructor() {
    this.metricId = Number(this.route.snapshot.paramMap.get('id'));
    this.filterForm.valueChanges.subscribe(() => {
      if (this.filterForm.valid) {
        this.loadChart();
      }
    });
  }

  async ionViewDidEnter() {
    this.metric = await this.metricService.getById(this.metricId);
    await this.loadLinkedItem();
  }

  async loadLinkedItem() {
    const [actionMetrics, tagMetrics, itemMetrics] = await Promise.all([
      this.actionMetricService.getAllWhereEquals('metricId', this.metricId),
      this.tagMetricService.getAllWhereEquals('metricId', this.metricId),
      this.itemMetricService.getAllWhereEquals('metricId', this.metricId),
    ]);

    if (actionMetrics.length) {
      const action = await this.actionService.getById(actionMetrics[0].actionId);
      if (action) {
        this.linkedItem = { name: action.name, type: 'action', itemId: action.id };
      }
    } else if (tagMetrics.length) {
      const tag = await this.tagService.getById(tagMetrics[0].tagId);
      if (tag) {
        this.linkedItem = { name: tag.name, type: 'tag', itemId: tag.id };
      }
    } else if (itemMetrics.length) {
      const item = await this.itemService.getById(itemMetrics[0].itemId);
      if (item) {
        this.linkedItem = { name: item.name, type: 'item', itemId: item.id };
      }
    } else {
      this.linkedItem = undefined;
    }
  }

  async loadChart() {
    const { startDate, endDate } = this.filterForm.value.datePeriod ?? {};
    if (!startDate || !endDate) return;

    const activities = await this.activityService.getByDate(startDate, endDate);

    const dates = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      .map(d => format(d, 'yyyy-MM-dd'));

    const dataPoints = dates.map((date) => {
      const records = activities
        .filter((a) => a.date === date)
        .flatMap((a) => a.metricRecords)
        .filter((r) => r.metricId === this.metricId && r.value != null);

      if (!records.length) return null;
      return records.reduce((sum, r) => sum + r.value, 0) / records.length;
    });

    const metricName = this.metric?.name ? this.translate.instant(this.metric.name) : '';

    this.chartData = {
      labels: dates,
      datasets: [{ data: dataPoints as (number | null)[], label: metricName, spanGaps: true }],
    };
  }
}
