import { Component, inject } from '@angular/core';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, ActionSheetController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { IActivity } from 'src/app/db/models/activity';
import { IMetric } from 'src/app/db/models/metric';
import { ActivityService } from 'src/app/services/activity.service';
import { MetricService } from 'src/app/services/metric.service';
import { ListService } from 'src/app/services/list.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TagsComponent } from 'src/app/components/tags/tags.component';
import { entitiesToString, getTimeString } from 'src/app/functions/string';
import { getActivityDurationMinutes } from 'src/app/functions/activity';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { IList } from 'src/app/db/models/list';
import { IItem } from 'src/app/db/models/item';
import { RuleService } from 'src/app/services/rule.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { ActivityRuleResult, computeRuleResultsForActivity } from 'src/app/functions/rule-color';

@Component({
  selector: 'app-activity-view',
  templateUrl: './activity-view.page.html',
  styleUrls: ['./activity-view.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, CommonModule, TranslateModule, BackButtonComponent, TagsComponent],
})
export class ActivityViewPage {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private activityService = inject(ActivityService);
  private metricService = inject(MetricService);
  private listService = inject(ListService);
  private ruleService = inject(RuleService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);

  activityId: number;
  activity?: IActivity;
  metrics: IMetric[] = [];
  itemsGroupedByList: { list: IList; items: IItem[] }[] = [];
  triggeredRules: ActivityRuleResult[] = [];

  private allActions: IActionDb[] = [];
  private allTags: ITag[] = [];
  private allItems: IItem[] = [];

  entitiesToString = entitiesToString;

  actionSheetButtons = [
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  constructor() {
    addIcons({ calendarOutline, timeOutline });
    this.activityId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async openMenu() {
    const actionSheet = await this.actionSheetCtrl.create({ buttons: this.actionSheetButtons });
    await actionSheet.present();
    const { data } = await actionSheet.onWillDismiss();
    if (data?.action) await this.doAction(data.action);
  }

  async doAction(action: string) {
    switch (action) {
      case 'edit':
        await this.router.navigate(['/activity/edit', this.activityId]);
        break;
      case 'delete':
        await this.deleteActivity();
        break;
    }
  }

  async deleteActivity() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'yes') {
      await this.activityService.deleteWithRelations(this.activityId);
      this.toastService.enqueue({ title: 'TK_ACTIVITY_DELETED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/activity']);
    }
  }

  async ionViewDidEnter() {
    const [activity, metrics, rules, allActivities, actions, tags, items, lists] = await Promise.all([
      this.activityService.getEnriched(this.activityId),
      this.metricService.getAll(),
      this.ruleService.getAll(),
      this.activityService.getAllEnriched(),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
      this.listService.getAll(),
    ]);

    this.activity = activity;
    this.metrics = metrics;
    this.allActions = actions;
    this.allTags = tags;
    this.allItems = items;

    if (this.activity) {
      this.triggeredRules = computeRuleResultsForActivity(this.activity, allActivities, rules);
    }

    if (this.activity?.items.length) {
      const listMap = new Map(lists.map(l => [l.id, l]));
      const groups = new Map<number, IItem[]>();
      for (const item of this.activity.items) {
        const group = groups.get(item.listId) ?? [];
        group.push(item);
        groups.set(item.listId, group);
      }
      this.itemsGroupedByList = [...groups.entries()]
        .map(([listId, groupItems]) => ({ list: listMap.get(listId)!, items: groupItems }))
        .filter(g => g.list);
    } else {
      this.itemsGroupedByList = [];
    }
  }

  getAllTags() {
    if (!this.activity) return [];
    const seen = new Set<number>();
    const all = [];
    for (const tag of [...this.activity.tags, ...this.activity.actions.flatMap(a => a.tags)]) {
      if (!seen.has(tag.id)) {
        seen.add(tag.id);
        all.push(tag);
      }
    }
    return all;
  }

  getDurationMinutes(): number {
    if (!this.activity) return 0;
    return getActivityDurationMinutes(this.activity);
  }

  getTimeString(minutes: number) {
    return getTimeString(this.translate, minutes);
  }

  getMetricName(metricId: number) {
    return this.metrics.find(m => m.id === metricId)?.name ?? String(metricId);
  }

  getMetricUnit(metricId: number) {
    return this.metrics.find(m => m.id === metricId)?.unit ?? '';
  }

  getRuleName(result: ActivityRuleResult): string {
    const rule = result.rule;
    let subjectName = '';
    if (rule.subjectType === 'action') subjectName = this.allActions.find(a => a.id === rule.subjectId)?.name ?? '';
    else if (rule.subjectType === 'tag') subjectName = this.allTags.find(t => t.id === rule.subjectId)?.name ?? '';
    else subjectName = this.allItems.find(i => i.id === rule.subjectId)?.name ?? '';
    return this.ruleService.buildName(rule, subjectName);
  }
}
