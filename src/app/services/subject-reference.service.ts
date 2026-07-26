import { Injectable, Injector, inject } from '@angular/core';
import { RuleSubjectType } from '../db/models/rule';
import { DashboardConfigService } from './dashboard-config.service';
import { ExperimentIndicatorService } from './experiment-indicator.service';
import { ListLinkService } from './list-link.service';
import { RuleService } from './rule.service';
import { ItemService } from './item.service';
import { BlockingUsage, SubjectUsage } from '../types/subject-usage';
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
  // Resolved lazily: ItemService injects this service to clean up an item's
  // references, so injecting it eagerly would close a DI cycle.
  private injector = inject(Injector);

  /**
   * What still points at one action / tag / item, or null when nothing does.
   *
   * `listLinks` are deliberately not counted: a link only says "offer this list
   * when the subject is picked", so it is meaningless once the subject is gone
   * and is cleaned up rather than treated as a reason to refuse the delete.
   */
  async findSubjectUsage(
    subjectType: RuleSubjectType,
    subjectId: number,
  ): Promise<SubjectUsage | null> {
    const rules = await this.ruleService.getAll({ subjectType, subjectId });
    if (rules.length) {
      return 'rule';
    }

    const indicators = await this.experimentIndicatorService.getAll({ subjectType, subjectId });
    if (indicators.length) {
      return 'experiment';
    }

    const widgets = await this.dashboardConfigService.getWidgets();
    if (widgets.some((widget) => this.targetsSubject(widget, subjectType, subjectId))) {
      return 'widget';
    }

    return null;
  }

  /**
   * The first live reference to any item of `listId`, or null when the list can
   * be deleted safely.
   *
   * Deleting a list cascade-deletes its items in SQLite, but nothing cascades
   * the `(subjectType, subjectId)` references that point at those items — the
   * list would take rules, experiment indicators and dashboard widgets down to
   * dangling ids. Callers use this to refuse the delete and name what is still
   * using the item instead.
   */
  async findListItemUsage(listId: number): Promise<BlockingUsage | null> {
    const itemService = this.injector.get(ItemService);
    const items = await itemService.getAllWhereEquals('listId', listId);

    if (!items.length) {
      return null;
    }

    // Read each source once and match in memory: per-item queries would be
    // three round trips per item on a list that can hold hundreds.
    const [rules, indicators, widgets] = await Promise.all([
      this.ruleService.getAll({ subjectType: 'item' }),
      this.experimentIndicatorService.getAll({ subjectType: 'item' }),
      this.dashboardConfigService.getWidgets(),
    ]);

    const ruleIds = new Set(rules.map((rule) => rule.subjectId));
    const indicatorIds = new Set(indicators.map((indicator) => indicator.subjectId));

    for (const item of items) {
      if (ruleIds.has(item.id)) {
        return { usage: 'rule', name: item.name };
      }

      if (indicatorIds.has(item.id)) {
        return { usage: 'experiment', name: item.name };
      }

      if (widgets.some((widget) => this.targetsSubject(widget, 'item', item.id))) {
        return { usage: 'widget', name: item.name };
      }
    }

    return null;
  }

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
