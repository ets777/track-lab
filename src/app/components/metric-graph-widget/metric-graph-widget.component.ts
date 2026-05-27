import { Component, Input, inject } from '@angular/core';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format, subDays } from 'date-fns';
import { MetricGraphWidgetConfig, WidgetPeriod } from 'src/app/types/dashboard-widget';
import { MetricService } from 'src/app/services/metric.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { IMetric } from 'src/app/db/models/metric';
import { DatePeriod } from 'src/app/types/date-period';
import { StatsContentComponent } from 'src/app/components/stats-content/stats-content.component';

function widgetPeriodToDatePeriod(period: WidgetPeriod): DatePeriod {
  const today = new Date();
  const days = period === '1w' ? 7 : period === '2w' ? 14 : 30;
  return {
    startDate: format(subDays(today, days - 1), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
}

@Component({
  selector: 'app-metric-graph-widget',
  templateUrl: './metric-graph-widget.component.html',
  styleUrl: './metric-graph-widget.component.scss',
  imports: [IonSkeletonText, TranslateModule, StatsContentComponent],
})
export class MetricGraphWidgetComponent {
  @Input() set config(value: MetricGraphWidgetConfig) {
    this._config = value;
    this.init();
  }
  get config(): MetricGraphWidgetConfig { return this._config!; }
  private _config?: MetricGraphWidgetConfig;

  private metricService = inject(MetricService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);

  isLoading = true;
  allMetrics: IMetric[] = [];
  fixedMetricName: string | undefined = undefined;
  initialPeriod: DatePeriod | null = null;
  chartColor: string | undefined = undefined;

  private async init(): Promise<void> {
    if (!this._config) return;
    this.isLoading = true;
    try {
      this.allMetrics = await this.metricService.getAll() as IMetric[];
      this.fixedMetricName = this._config.metricName ?? undefined;
      this.initialPeriod = widgetPeriodToDatePeriod(this._config.period);
      this.chartColor = this._config.color ?? undefined;
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('MetricGraphWidgetComponent.init', e);
    } finally {
      this.isLoading = false;
    }
  }
}
