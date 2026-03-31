import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { MetricForm } from '../components/metric-form/metric-form.component';
import { ActionMetricService } from './action-metric.service';
import { TagMetricService } from './tag-metric.service';
import { TermMetricService } from './term-metric.service';

@Injectable({ providedIn: 'root' })
export class MetricService extends DatabaseService<'metrics'> {
  protected tableName: 'metrics' = 'metrics';
  private actionMetricService = inject(ActionMetricService);
  private tagMetricService = inject(TagMetricService);
  private termMetricService = inject(TermMetricService);

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
      step: form.step ?? 1,
      minValue: form.minValue,
      maxValue: form.maxValue,
      showPreviousValue: form.showPreviousValue ?? false,
    });

    if (form.term?.type === 'action' && form.term.termId) {
      await this.actionMetricService.add({ actionId: form.term.termId, metricId });
    } else if (form.term?.type === 'tag' && form.term.termId) {
      await this.tagMetricService.add({ tagId: form.term.termId, metricId });
    } else if (form.term?.termId) {
      await this.termMetricService.add({ termId: form.term.termId, metricId });
    }

    return metricId;
  }
}
