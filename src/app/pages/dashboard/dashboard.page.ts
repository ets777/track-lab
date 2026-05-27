import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { MainActionWidgetComponent } from 'src/app/components/main-action-widget/main-action-widget.component';
import { RulesChecklistWidgetComponent, ChecklistItem } from 'src/app/components/rules-checklist-widget/rules-checklist-widget.component';
import { NavigationGridWidgetComponent } from 'src/app/components/navigation-grid-widget/navigation-grid-widget.component';
import { MetricGraphWidgetComponent } from 'src/app/components/metric-graph-widget/metric-graph-widget.component';
import { LibraryGraphWidgetComponent } from 'src/app/components/library-graph-widget/library-graph-widget.component';
import { ExperimentDashboardWidgetComponent } from 'src/app/components/experiment-dashboard-widget/experiment-dashboard-widget.component';
import { DashboardConfigService } from 'src/app/services/dashboard-config.service';
import { RuleService } from 'src/app/services/rule.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { computeRuleStatusesForDay } from 'src/app/functions/rule-color';
import { IRule } from 'src/app/db/models/rule';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import {
  DashboardWidget, WidgetConfig,
  ActionButtonWidgetConfig, NavigationWidgetConfig,
  MetricGraphWidgetConfig, LibraryGraphWidgetConfig, ExperimentWidgetConfig,
  getWidgetHeight, getMaxDashboardRows,
} from 'src/app/types/dashboard-widget';

const ACTION_ROUTES: Record<string, string> = {
  'new-activity': '/activity/add',
  'new-action': '/action/add',
  'new-tag': '/tag/add',
};

const ACTION_LABELS: Record<string, string> = {
  'new-activity': 'TK_NEW_ACTIVITY',
  'new-action': 'TK_NEW_ACTION',
  'new-tag': 'TK_NEW_TAG',
};

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    TranslateModule,
    MainActionWidgetComponent,
    RulesChecklistWidgetComponent,
    NavigationGridWidgetComponent,
    MetricGraphWidgetComponent,
    LibraryGraphWidgetComponent,
    ExperimentDashboardWidgetComponent,
  ],
})
export class DashboardPage {
  private configService = inject(DashboardConfigService);
  private ruleService = inject(RuleService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private router = inject(Router);

  private readonly RULES_COUNT_KEY = 'dashboard_rules_count';

  widgets: DashboardWidget[] = [];
  readonly getWidgetHeight = getWidgetHeight;
  checklistLoading = true;
  checklistItems: ChecklistItem[] = [];
  checklistSkeletonCount = parseInt(localStorage.getItem(this.RULES_COUNT_KEY) ?? '4', 10);

  constructor() {
    addIcons({ settingsOutline });
  }

  get dashboardGridRows(): string {
    return `repeat(${getMaxDashboardRows(window.innerHeight)}, 1fr)`;
  }

  ionViewWillEnter(): void {
    this.widgets = this.configService.getWidgets();
    this.checklistSkeletonCount = parseInt(localStorage.getItem(this.RULES_COUNT_KEY) ?? '4', 10);
    this.checklistLoading = true;
  }

  async ionViewDidEnter(): Promise<void> {
    if (this.widgets.some(w => w.config.type === 'rules')) {
      await this.loadRulesChecklist();
    } else {
      this.checklistLoading = false;
    }
  }

  private async loadRulesChecklist(): Promise<void> {
    this.checklistLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const rules = await this.ruleService.getAll();
      const minDate = this.getMinDateForRules(rules as IRule[], today);
      const [activities, actions, tags, items] = await Promise.all([
        this.activityService.getByDate(minDate, today),
        this.actionService.getAll() as Promise<IActionDb[]>,
        this.tagService.getAll() as Promise<ITag[]>,
        this.itemService.getAll() as Promise<IItem[]>,
      ]);
      const statuses = computeRuleStatusesForDay(today, activities, rules);
      this.checklistItems = statuses
        .map(s => ({
          name: this.resolveName(s.rule, actions, tags, items),
          met: s.color === 'green',
          progress: s.progress ? `${s.progress.current}/${s.progress.target}` : null,
        }))
        .sort((a, b) => Number(a.met) - Number(b.met));
      localStorage.setItem(this.RULES_COUNT_KEY, String(this.checklistItems.length));
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('DashboardPage.loadRulesChecklist', e);
    } finally {
      this.checklistLoading = false;
    }
  }

  openSettings(): void {
    this.router.navigate(['/dashboard-settings']);
  }

  getActionLabel(config: WidgetConfig): string {
    return ACTION_LABELS[(config as ActionButtonWidgetConfig).action] ?? 'TK_NEW_ACTIVITY';
  }

  getActionRoute(config: WidgetConfig): string {
    return ACTION_ROUTES[(config as ActionButtonWidgetConfig).action] ?? '/activity/add';
  }

  getActionColor(config: WidgetConfig): string | undefined {
    return (config as ActionButtonWidgetConfig).color;
  }

  asNavConfig(config: WidgetConfig): NavigationWidgetConfig {
    return config as NavigationWidgetConfig;
  }

  asMetricConfig(config: WidgetConfig): MetricGraphWidgetConfig {
    return config as MetricGraphWidgetConfig;
  }

  asLibraryConfig(config: WidgetConfig): LibraryGraphWidgetConfig {
    return config as LibraryGraphWidgetConfig;
  }

  asExperimentConfig(config: WidgetConfig): ExperimentWidgetConfig {
    return config as ExperimentWidgetConfig;
  }

  private getMinDateForRules(rules: IRule[], today: string): string {
    if (rules.some(r => r.period === 'month')) return `${today.slice(0, 7)}-01`;
    if (rules.some(r => r.period === 'week')) {
      const d = new Date(today + 'T00:00:00');
      const dayOfWeek = (d.getDay() + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - dayOfWeek);
      return monday.toISOString().slice(0, 10);
    }
    return today;
  }

  private resolveName(rule: IRule, actions: IActionDb[], tags: ITag[], items: IItem[]): string {
    let subjectName = '';
    if (rule.subjectType === 'action') subjectName = actions.find(a => a.id === rule.subjectId)?.name ?? '';
    else if (rule.subjectType === 'tag') subjectName = tags.find(t => t.id === rule.subjectId)?.name ?? '';
    else subjectName = items.find(i => i.id === rule.subjectId)?.name ?? '';
    return this.ruleService.buildName(rule, subjectName);
  }
}
