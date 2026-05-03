import { Component, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { format } from 'date-fns';
import { MainActionWidgetComponent } from 'src/app/components/main-action-widget/main-action-widget.component';
import { LinkWidgetComponent } from 'src/app/components/link-widget/link-widget.component';
import { RulesChecklistWidgetComponent, ChecklistItem } from 'src/app/components/rules-checklist-widget/rules-checklist-widget.component';
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

interface NavWidget {
  icon: string;
  label: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, TranslateModule, MainActionWidgetComponent, LinkWidgetComponent, RulesChecklistWidgetComponent],
})
export class DashboardPage {
  private ruleService = inject(RuleService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);

  private readonly RULES_COUNT_KEY = 'dashboard_rules_count';

  checklistLoading = true;
  checklistItems: ChecklistItem[] = [];
  checklistSkeletonCount = parseInt(localStorage.getItem(this.RULES_COUNT_KEY) ?? '4', 10);

  navWidgets: NavWidget[] = [
    { icon: 'time-outline',             label: 'TK_HISTORY',      route: '/activity',           color: '#3D8B9E' },
    { icon: 'shield-checkmark-outline', label: 'TK_RULES',        route: '/rule',               color: '#5E9065' },
    { icon: 'bar-chart-outline',        label: 'TK_STATS',        route: '/stats',              color: '#7A6AAF' },
    { icon: 'library-outline',          label: 'TK_LIBRARY',      route: '/library',            color: '#A87545' },
    { icon: 'settings-outline',         label: 'TK_SETTINGS',     route: '/settings',           color: '#6A8098' },
    { icon: 'trophy-outline',           label: 'TK_ACHIEVEMENTS', route: '/stats/achievements', color: '#C4993A' },
  ];

  ionViewWillEnter() {
    this.checklistSkeletonCount = parseInt(localStorage.getItem(this.RULES_COUNT_KEY) ?? '4', 10);
    this.checklistLoading = true;
  }

  async ionViewDidEnter() {
    this.checklistLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [rules, activities, actions, tags, items] = await Promise.all([
        this.ruleService.getAll(),
        this.activityService.getAllEnriched(),
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
      this.logService.error('DashboardPage.ionViewDidEnter', e);
    } finally {
      this.checklistLoading = false;
    }
  }

  private resolveName(rule: IRule, actions: IActionDb[], tags: ITag[], items: IItem[]): string {
    let subjectName = '';
    if (rule.subjectType === 'action') subjectName = actions.find(a => a.id === rule.subjectId)?.name ?? '';
    else if (rule.subjectType === 'tag') subjectName = tags.find(t => t.id === rule.subjectId)?.name ?? '';
    else subjectName = items.find(i => i.id === rule.subjectId)?.name ?? '';
    return this.ruleService.buildName(rule, subjectName);
  }
}
