import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
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
  imports: [IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BaseChartDirective, BackButtonComponent, DatePeriodInputComponent],
})
export class MetricViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
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
  private actionSheetCtrl = inject(ActionSheetController);

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

  getActionSheetButtons() {
    const buttons: any[] = [
      { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    ];
    if (!this.metric?.isBase) {
      buttons.push({ text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } });
    }
    return buttons;
  }

  async openMenu() {
    const actionSheet = await this.actionSheetCtrl.create({ buttons: this.getActionSheetButtons() });
    await actionSheet.present();
    const { data } = await actionSheet.onWillDismiss();
    if (data?.action) await this.doAction(data.action);
  }

  async doAction(action: string) {
    switch (action) {
      case 'edit':
        await this.router.navigate(['/metric/edit', this.metricId]);
        break;
      case 'delete':
        await this.deleteMetric();
        break;
    }
  }

  async deleteMetric() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'yes') {
      await this.metricService.delete({ id: this.metricId });
      this.toastService.enqueue({ title: 'TK_METRIC_DELETED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/metric']);
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
