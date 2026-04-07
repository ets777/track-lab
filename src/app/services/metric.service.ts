import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { MetricForm } from '../components/metric-form/metric-form.component';
import { ActionMetricService } from './action-metric.service';
import { TagMetricService } from './tag-metric.service';
import { ItemMetricService } from './item-metric.service';
import { HookService } from './hook.service';

@Injectable({ providedIn: 'root' })
export class MetricService extends DatabaseService<'metrics'> {
  protected tableName: 'metrics' = 'metrics';
  private actionMetricService = inject(ActionMetricService);
  private tagMetricService = inject(TagMetricService);
  private itemMetricService = inject(ItemMetricService);
  private hookService = inject(HookService);

  async getStandalone() {
    const all = await this.getAll();
    const allActionMetrics = await this.actionMetricService.getAll();
    const linkedIds = new Set(allActionMetrics.map((am) => am.metricId));
    return all.filter((m) => !m.isHidden && !linkedIds.has(m.id));
  }

  async addFromForm(form: MetricForm): Promise<number> {
    const metricId = await this.add({
      name: form.name,
      isHidden: form.isHidden ?? false,
      unit: form.unit || undefined,
      step: Number(form.step ?? 1),
      minValue: Number(form.minValue),
      maxValue: Number(form.maxValue),
      showPreviousValue: form.showPreviousValue ?? false,
    });

    if (form.term?.type === 'action' && form.term.itemId) {
      await this.actionMetricService.add({ actionId: form.term.itemId, metricId });
    } else if (form.term?.type === 'tag' && form.term.itemId) {
      await this.tagMetricService.add({ tagId: form.term.itemId, metricId });
    } else if (form.term?.itemId) {
      await this.itemMetricService.add({ itemId: form.term.itemId, metricId });
    }

    this.hookService.emit({ type: 'metric.added', payload: {} });

    return metricId;
  }
}
