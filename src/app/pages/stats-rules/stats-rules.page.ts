import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonText, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { startOfMonth, subDays, format } from 'date-fns';
import { RuleService } from 'src/app/services/rule.service';
import { RuleCompletionService } from 'src/app/services/rule-completion.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IActivity } from 'src/app/db/models/activity';
import { IRule, RulePeriod } from 'src/app/db/models/rule';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import { RuleDayStatus, computeRuleStatusesForDay } from 'src/app/functions/rule-color';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';
import { AggregateRuleCalendarComponent } from 'src/app/components/aggregate-rule-calendar/aggregate-rule-calendar.component';

@Component({
  selector: 'app-stats-rules',
  templateUrl: './stats-rules.page.html',
  styleUrls: ['./stats-rules.page.scss'],
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonText, IonSegment, IonSegmentButton,
    CommonModule, FormsModule, TranslateModule,
    DefaultSkeletonComponent, AggregateRuleCalendarComponent, NavButtonComponent,
  ],
})
export class StatsRulesPage {
  private ruleService = inject(RuleService);
  private ruleCompletionService = inject(RuleCompletionService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  router = inject(Router);
  private navigationService = inject(NavigationService);

  get showBackButton(): boolean {
    return this.navigationService.fromDashboard;
  }

  isLoading = true;

  allActivities: IActivity[] = [];
  private allRules: IRule[] = [];
  private allActions: IActionDb[] = [];
  private allTags: ITag[] = [];
  private allItems: IItem[] = [];

  selectedTab: RulePeriod = 'day';
  filteredRules: IRule[] = [];
  selectedDate = '';
  ruleDayStatuses: RuleDayStatus[] = [];
  completionsMap: Map<number, Map<string, boolean>> = new Map();

  ionViewWillEnter() {
    this.isLoading = true;
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));

    const recentFrom = format(startOfMonth(subDays(new Date(), 31)), 'yyyy-MM-dd');

    [this.allRules, this.allActivities, this.allActions, this.allTags, this.allItems] = await Promise.all([
      this.ruleService.getAll(),
      this.activityService.getAllEnrichedForRules(recentFrom),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
    ]);

    const completionsMap = new Map<number, Map<string, boolean>>();
    for (const rule of this.allRules) {
      const completions = await this.ruleCompletionService.archiveAndGetCompletions(rule);
      const map = new Map<string, boolean>();
      for (const c of completions) map.set(c.periodStart, c.met === 1);
      completionsMap.set(rule.id, map);
    }
    this.completionsMap = completionsMap;

    this.selectedTab = 'day';
    this.selectedDate = format(new Date(), 'yyyy-MM-dd');
    this.applyTab();

    this.isLoading = false;
  }

  onTabChange(event: CustomEvent): void {
    this.selectedTab = event.detail.value as RulePeriod;
    const today = new Date();
    this.selectedDate = this.selectedTab === 'month'
      ? format(startOfMonth(today), 'yyyy-MM-dd')
      : format(today, 'yyyy-MM-dd');
    this.applyTab();
  }

  onDaySelected(date: string): void {
    this.selectedDate = date;
    this.updateStatuses();
  }

  onMonthChanged(date: Date): void {
    if (this.selectedTab === 'month') {
      this.selectedDate = format(startOfMonth(date), 'yyyy-MM-dd');
      this.updateStatuses();
    }
  }

  getRuleName(result: RuleDayStatus): string {
    const rule = result.rule;
    let subjectName = '';
    if (rule.subjectType === 'action') subjectName = this.allActions.find(a => a.id === rule.subjectId)?.name ?? '';
    else if (rule.subjectType === 'tag') subjectName = this.allTags.find(t => t.id === rule.subjectId)?.name ?? '';
    else subjectName = this.allItems.find(i => i.id === rule.subjectId)?.name ?? '';
    return this.ruleService.buildName(rule, subjectName);
  }

  private applyTab(): void {
    this.filteredRules = this.allRules.filter(r => r.period === this.selectedTab);
    this.updateStatuses();
  }

  private updateStatuses(): void {
    this.ruleDayStatuses = computeRuleStatusesForDay(this.selectedDate, this.allActivities, this.filteredRules);
  }
}
