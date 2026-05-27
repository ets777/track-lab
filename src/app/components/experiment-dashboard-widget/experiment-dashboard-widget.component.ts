import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { flaskOutline, arrowUpOutline, arrowDownOutline, arrowForwardOutline } from 'ionicons/icons';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import { ExperimentWidgetConfig } from 'src/app/types/dashboard-widget';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ExperimentIndicatorService } from 'src/app/services/experiment-indicator.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { MetricService } from 'src/app/services/metric.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { IExperiment } from 'src/app/db/models/experiment';
import { IExperimentIndicator } from 'src/app/db/models/experiment-indicator';
import { IActivity } from 'src/app/db/models/activity';
import { IMetric } from 'src/app/db/models/metric';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';

interface IndicatorRow {
  name: string;
  baselineValue: string | null;
  currentValue: string | null;
  arrowUp: boolean | null;
  color: 'success' | 'danger' | 'medium';
}

@Component({
  selector: 'app-experiment-dashboard-widget',
  templateUrl: './experiment-dashboard-widget.component.html',
  styleUrl: './experiment-dashboard-widget.component.scss',
  imports: [IonCard, IonCardContent, IonIcon, IonSkeletonText, TranslateModule],
})
export class ExperimentDashboardWidgetComponent {
  @Input() set config(value: ExperimentWidgetConfig) {
    this._config = value;
    this.load();
  }
  get config(): ExperimentWidgetConfig { return this._config!; }
  private _config?: ExperimentWidgetConfig;

  private experimentService = inject(ExperimentService);
  private indicatorService = inject(ExperimentIndicatorService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private metricService = inject(MetricService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);
  private router = inject(Router);

  isLoading = true;
  experiment: IExperiment | null = null;
  progressPercent = 0;
  indicators: IndicatorRow[] = [];

  constructor() {
    addIcons({ flaskOutline, arrowUpOutline, arrowDownOutline, arrowForwardOutline });
  }

  private async load(): Promise<void> {
    if (!this._config) return;
    this.isLoading = true;
    try {
      const exp = await this.experimentService.getById(this._config.experimentId);
      if (!exp) { this.isLoading = false; return; }
      this.experiment = exp as IExperiment;
      this.progressPercent = this.computeProgress(this.experiment);

      const [dbIndicators, actions, tags, items, metrics] = await Promise.all([
        this.indicatorService.getByExperimentId(this.experiment.id),
        this.actionService.getAll() as Promise<IActionDb[]>,
        this.tagService.getAll() as Promise<ITag[]>,
        this.itemService.getAll() as Promise<IItem[]>,
        this.metricService.getAll() as Promise<IMetric[]>,
      ]);

      const today = format(new Date(), 'yyyy-MM-dd');
      const startDate = this.experiment.startDate ?? today;
      const effectiveEnd = this.experiment.factEndDate ?? this.experiment.endDate;
      const currentEnd = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;

      const baselineEnd = startDate;
      const baselineStart = format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd');
      const currentStart = format(subDays(parseISO(currentEnd), 6), 'yyyy-MM-dd');

      const [baselineActs, currentActs] = await Promise.all([
        this.activityService.getByDate(baselineStart, baselineEnd),
        this.activityService.getByDate(currentStart, currentEnd),
      ]);

      this.indicators = (dbIndicators as IExperimentIndicator[]).slice(0, 3).map(ind => {
        const name = this.resolveIndicatorName(ind, actions, tags, items, metrics);
        const { baselineRaw, currentRaw, fmtFn } = this.resolveValues(ind, baselineActs, currentActs, metrics);
        const baselineValue = baselineRaw !== null ? fmtFn(baselineRaw) : null;
        const currentValue = currentRaw !== null ? fmtFn(currentRaw) : null;
        let arrowUp: boolean | null = null;
        let color: IndicatorRow['color'] = 'medium';
        if (baselineRaw !== null && currentRaw !== null && currentRaw !== baselineRaw) {
          arrowUp = currentRaw > baselineRaw;
          if (ind.direction === 'increasing') color = arrowUp ? 'success' : 'danger';
          else if (ind.direction === 'decreasing') color = arrowUp ? 'danger' : 'success';
        }
        return { name, baselineValue, currentValue, arrowUp, color };
      });
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentDashboardWidgetComponent.load', e);
    } finally {
      this.isLoading = false;
    }
  }

  private computeProgress(exp: IExperiment): number {
    if (!exp.startDate || !exp.endDate) return 0;
    const today = new Date();
    const start = parseISO(exp.startDate);
    const end = parseISO(exp.endDate);
    const total = differenceInDays(end, start);
    if (total <= 0) return 100;
    const elapsed = Math.min(differenceInDays(today, start), total);
    return Math.round((elapsed / total) * 100);
  }

  private resolveIndicatorName(
    ind: IExperimentIndicator,
    actions: IActionDb[], tags: ITag[], items: IItem[], metrics: IMetric[],
  ): string {
    if (ind.subjectType === 'metric') {
      const m = metrics.find(x => x.id === ind.subjectId);
      return m ? this.translate.instant(m.name) : String(ind.subjectId);
    }
    if (ind.subjectType === 'action') return actions.find(a => a.id === ind.subjectId)?.name ?? String(ind.subjectId);
    if (ind.subjectType === 'tag') return tags.find(t => t.id === ind.subjectId)?.name ?? String(ind.subjectId);
    return items.find(i => i.id === ind.subjectId)?.name ?? String(ind.subjectId);
  }

  private resolveValues(
    ind: IExperimentIndicator,
    baselineActs: IActivity[],
    currentActs: IActivity[],
    metrics: IMetric[],
  ): { baselineRaw: number | null; currentRaw: number | null; fmtFn: (v: number) => string } {
    if (ind.subjectType === 'metric') {
      const metric = metrics.find(m => m.id === ind.subjectId);
      const unit = metric?.unit ? ' ' + metric.unit : '';
      const avg = (acts: IActivity[]) => {
        const vals = acts.flatMap(a => a.metricRecords.filter(r => r.metricId === ind.subjectId)).map(r => r.value);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      return { baselineRaw: avg(baselineActs), currentRaw: avg(currentActs), fmtFn: v => `${Math.round(v * 10) / 10}${unit}` };
    }
    const minPerDay = (acts: IActivity[]) => {
      const matching = acts.filter(a => {
        if (ind.subjectType === 'action') return a.actions.some(ac => ac.id === ind.subjectId);
        if (ind.subjectType === 'tag') return a.tags.some(t => t.id === ind.subjectId) || a.actions.some(ac => ac.tags.some(t => t.id === ind.subjectId));
        return a.items.some(i => i.id === ind.subjectId);
      });
      const total = matching.reduce((sum, a) => {
        if (!a.endTime) return sum;
        const [sh, sm] = a.startTime.split(':').map(Number);
        const [eh, em] = a.endTime.split(':').map(Number);
        return sum + Math.max(0, eh * 60 + em - sh * 60 - sm);
      }, 0);
      return total > 0 ? Math.round((total / 7) * 10) / 10 : null;
    };
    return { baselineRaw: minPerDay(baselineActs), currentRaw: minPerDay(currentActs), fmtFn: v => `${v} min/day` };
  }

  navigate(): void {
    this.router.navigate(['/experiment', this._config!.experimentId]);
  }
}
