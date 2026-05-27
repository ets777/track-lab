import { Component, Input, inject } from '@angular/core';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { format, subDays } from 'date-fns';
import { LibraryGraphWidgetConfig, WidgetPeriod } from 'src/app/types/dashboard-widget';
import { ListService } from 'src/app/services/list.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { IList } from 'src/app/db/models/list';
import { CommonItem } from 'src/app/types/selectable';
import { DatePeriod } from 'src/app/types/date-period';
import { StatsItemContentComponent } from 'src/app/components/stats-item-content/stats-item-content.component';

function widgetPeriodToDatePeriod(period: WidgetPeriod): DatePeriod {
  const today = new Date();
  const days = period === '1w' ? 7 : period === '2w' ? 14 : 30;
  return {
    startDate: format(subDays(today, days - 1), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
}

@Component({
  selector: 'app-library-graph-widget',
  templateUrl: './library-graph-widget.component.html',
  styleUrl: './library-graph-widget.component.scss',
  imports: [IonSkeletonText, TranslateModule, StatsItemContentComponent],
})
export class LibraryGraphWidgetComponent {
  @Input() set config(value: LibraryGraphWidgetConfig) {
    this._config = value;
    this.init();
  }
  get config(): LibraryGraphWidgetConfig { return this._config!; }
  private _config?: LibraryGraphWidgetConfig;

  private listService = inject(ListService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);

  isLoading = true;
  lists: IList[] = [];
  fixedItem: CommonItem | undefined = undefined;
  initialPeriod: DatePeriod | null = null;
  chartColor: string | undefined = undefined;

  private async init(): Promise<void> {
    if (!this._config) return;
    this.isLoading = true;
    try {
      this.lists = await this.listService.getAll();
      this.fixedItem = { itemId: this._config.itemId, name: this._config.itemName, type: this._config.itemType };
      this.initialPeriod = widgetPeriodToDatePeriod(this._config.period);
      this.chartColor = this._config.color ?? undefined;
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('LibraryGraphWidgetComponent.init', e);
    } finally {
      this.isLoading = false;
    }
  }
}
