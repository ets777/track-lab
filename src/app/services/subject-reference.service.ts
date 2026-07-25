import { Injectable, inject } from '@angular/core';
import { RuleSubjectType } from '../db/models/rule';
import { DashboardConfigService } from './dashboard-config.service';
import { ExperimentIndicatorService } from './experiment-indicator.service';
import { ListLinkService } from './list-link.service';
import { RuleService } from './rule.service';
import {
  DashboardWidget,
  LibraryGraphWidgetConfig,
  MetricGraphWidgetConfig,
  ExperimentWidgetConfig,
} from '../types/dashboard-widget';

/**
 * Deletes the references that foreign keys cannot express.
 *
 * `rules`, `experimentIndicators` and `listLinks` point at their subject with a
 * `(subjectType, subjectId)` pair, and dashboard widgets store entity ids in a
 * JSON blob. SQLite cannot declare a foreign key on any of those, so nothing
 * cascades — deleting an action used to leave a rule behind whose subject name
 * resolved to an empty string: a ghost row the user could see but not fix.
 *
 * Every entity delete routes through here so the cleanup lives in one place
 * instead of being re-derived in each entity service.
 */
@Injectable({ providedIn: 'root' })
export class SubjectReferenceService {
  private ruleService = inject(RuleService);
  private experimentIndicatorService = inject(ExperimentIndicatorService);
  private listLinkService = inject(ListLinkService);
  private dashboardConfigService = inject(DashboardConfigService);

  /** Remove everything pointing at an action / tag / item being deleted. */
  async removeSubjectReferences(subjectType: RuleSubjectType, subjectId: number): Promise<void> {
    const rules = await this.ruleService.getAll({ subjectType, subjectId });
    for (const rule of rules) {
      await this.ruleService.deleteWithRelations(rule.id);
    }

    await this.experimentIndicatorService.delete({ subjectType, subjectId });
    await this.listLinkService.delete({ subjectType, subjectId });

    await this.removeWidgets((widget) => this.targetsSubject(widget, subjectType, subjectId));
  }

  /** Remove everything pointing at a metric being deleted. */
  async removeMetricReferences(metricId: number): Promise<void> {
    await this.experimentIndicatorService.delete({ subjectType: 'metric', subjectId: metricId });

    await this.removeWidgets((widget) =>
      widget.config.type === 'metric-graph'
      && (widget.config as MetricGraphWidgetConfig).metricId === metricId
    );
  }

  /** Remove everything pointing at an experiment being deleted. */
  async removeExperimentReferences(experimentId: number): Promise<void> {
    await this.removeWidgets((widget) =>
      widget.config.type === 'experiment'
      && (widget.config as ExperimentWidgetConfig).experimentId === experimentId
    );
  }

  private targetsSubject(
    widget: DashboardWidget,
    subjectType: RuleSubjectType,
    subjectId: number,
  ): boolean {
    if (widget.config.type !== 'library-graph') return false;
    const config = widget.config as LibraryGraphWidgetConfig;
    return config.itemType === subjectType && config.itemId === subjectId;
  }

  private async removeWidgets(matches: (widget: DashboardWidget) => boolean): Promise<void> {
    const widgets = await this.dashboardConfigService.getWidgets();
    const remaining = widgets.filter((widget) => !matches(widget));

    if (remaining.length !== widgets.length) {
      await this.dashboardConfigService.save(remaining);
    }
  }
}
