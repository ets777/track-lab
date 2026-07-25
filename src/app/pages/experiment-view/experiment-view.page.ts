import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { format, subDays, parseISO } from 'date-fns';
import { IExperiment } from 'src/app/db/models/experiment';
import { IExperimentIndicator } from 'src/app/db/models/experiment-indicator';
import { IRule } from 'src/app/db/models/rule';
import { IActivity } from 'src/app/db/models/activity';
import { IMetric } from 'src/app/db/models/metric';
import { IList } from 'src/app/db/models/list';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { DatePeriod } from 'src/app/types/date-period';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ExperimentIndicatorService } from 'src/app/services/experiment-indicator.service';
import { ExperimentRuleService } from 'src/app/services/experiment-rule.service';
import { RuleService } from 'src/app/services/rule.service';
import { RuleCompletionService } from 'src/app/services/rule-completion.service';
import { ActivityService } from 'src/app/services/activity.service';
import { MetricService } from 'src/app/services/metric.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';
import { ExperimentViewContentComponent } from 'src/app/components/experiment-view-content/experiment-view-content.component';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { filterUniqueElements } from 'src/app/functions/item';

@Component({
  selector: 'app-experiment-view',
  templateUrl: './experiment-view.page.html',
  styleUrls: ['./experiment-view.page.scss'],
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon,
    CommonModule, TranslateModule,
    NavButtonComponent, DefaultSkeletonComponent, ExperimentViewContentComponent,
  ],
})
export class ExperimentViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private experimentService = inject(ExperimentService);
  private experimentIndicatorService = inject(ExperimentIndicatorService);
  private experimentRuleService = inject(ExperimentRuleService);
  private ruleService = inject(RuleService);
  private ruleCompletionService = inject(RuleCompletionService);
  private activityService = inject(ActivityService);
  private metricService = inject(MetricService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private logService = inject(LogService);

  experimentId: number;
  isLoading = true;

  experiment?: IExperiment;
  indicators: IExperimentIndicator[] = [];
  rules: IRule[] = [];
  allActivities: IActivity[] = [];
  completionsMap: Map<number, Map<string, boolean>> = new Map();
  initialGraphPeriod?: DatePeriod;
  allMetrics: IMetric[] = [];
  lists: IList[] = [];
  allSuggestions: Selectable<CommonItem>[] = [];
  allActions: IActionDb[] = [];
  allTags: ITag[] = [];
  allItems: IItem[] = [];

  constructor() {
    this.experimentId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));

    try {
      const [experiment, experimentIndicators, experimentRuleLinks, allRules, allMetrics, allActions, allTags, allItems, lists] = await Promise.all([
        this.experimentService.getById(this.experimentId),
        this.experimentIndicatorService.getByExperimentId(this.experimentId),
        this.experimentRuleService.getByExperimentId(this.experimentId),
        this.ruleService.getAll(),
        this.metricService.getAll(),
        this.actionService.getAll(),
        this.tagService.getAll(),
        this.itemService.getAll(),
        this.listService.getAll(),
      ]);

      if (!experiment) return;
      this.experiment = experiment;
      this.indicators = experimentIndicators;
      this.allMetrics = allMetrics;
      this.lists = lists;
      this.allActions = allActions;
      this.allTags = allTags;
      this.allItems = allItems;

      const ruleIds = new Set(experimentRuleLinks.map(r => r.ruleId));
      this.rules = allRules.filter(r => ruleIds.has(r.id));

      // Build suggestions for indicator display and stats-item-content
      const itemListId = new Map(allItems.filter(i => !i.isHidden).map(i => [i.id, i.listId]));
      const listNameById = new Map(lists.map(l => [l.id, l.name]));
      const actionCommon: CommonItem[] = allActions.filter(a => !a.isHidden).map(a => ({ name: a.name, type: 'action', itemId: a.id! }));
      const tagCommon: CommonItem[] = allTags.filter(t => !t.isHidden).map(t => ({ name: t.name, type: 'tag', itemId: t.id! }));
      const itemCommon: CommonItem[] = allItems.filter(i => !i.isHidden).map(i => ({ name: i.name, type: 'item', itemId: i.id }));
      const all = filterUniqueElements([...actionCommon, ...tagCommon, ...itemCommon]);
      this.allSuggestions = all.map((ci, index) => {
        let subtitle: string;
        if (ci.type === 'item') {
          const listId = itemListId.get(ci.itemId);
          const listName = listId !== undefined ? listNameById.get(listId) : undefined;
          subtitle = listName ? this.translate.instant(listName) : this.translate.instant('TK_ITEM');
        } else {
          subtitle = this.translate.instant('TK_' + ci.type.toUpperCase());
        }
        return { num: index, title: ci.name, subtitle, item: ci };
      });

      // Fetch activities covering experiment start, all rule start dates, and last 31 days
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyOneDaysAgo = format(subDays(new Date(), 31), 'yyyy-MM-dd');
      const dates = [thirtyOneDaysAgo, experiment.startDate, ...this.rules.map(r => r.startDate)].filter(Boolean) as string[];
      const activitiesFrom = dates.sort()[0];
      this.allActivities = await this.activityService.getAllEnrichedForRules(activitiesFrom);

      // Initial graph period: last 7 days of the experiment (or today for ongoing)
      const effectiveEnd = experiment.factEndDate ?? experiment.endDate;
      const graphEnd = effectiveEnd && effectiveEnd < today ? effectiveEnd : today;
      const sevenDaysBeforeEnd = format(subDays(parseISO(graphEnd), 6), 'yyyy-MM-dd');
      const graphStart = experiment.startDate && experiment.startDate > sevenDaysBeforeEnd
        ? experiment.startDate : sevenDaysBeforeEnd;
      this.initialGraphPeriod = { startDate: graphStart, endDate: graphEnd };

      // Build completions map for experiment rules
      const completionsMap = new Map<number, Map<string, boolean>>();
      for (const rule of this.rules) {
        const completions = await this.ruleCompletionService.archiveAndGetCompletions(rule);
        const map = new Map<string, boolean>();
        for (const c of completions) map.set(c.periodStart, c.met === 1);
        completionsMap.set(rule.id, map);
      }
      this.completionsMap = completionsMap;
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentViewPage.ionViewDidEnter', e);
    }

    this.isLoading = false;
  }

  async openMenu() {
    const isFinished = !!this.experiment?.factEndDate;
    const buttons = [];
    if (!isFinished) {
      buttons.push({ text: this.translate.instant('TK_EDIT'), icon: 'create-outline', data: { action: 'edit' } });
    }
    buttons.push({ text: this.translate.instant('TK_DELETE'), icon: 'trash-outline', role: 'destructive', data: { action: 'delete' } });

    const sheet = await this.actionSheetCtrl.create({ buttons });
    await sheet.present();
    const { data } = await sheet.onWillDismiss();
    if (data?.action === 'edit') {
      await this.router.navigate(['/experiment/edit', this.experimentId]);
    } else if (data?.action === 'delete') {
      await this.confirmDelete();
    }
  }

  private async confirmDelete() {
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
      try {
        await this.experimentService.deleteWithRelations(this.experimentId);
        this.toastService.enqueue({ title: 'TK_EXPERIMENT_DELETED_SUCCESSFULLY', type: 'success' });
        await this.router.navigate(['/experiment']);
      } catch (e) {
        this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
        this.logService.error('ExperimentViewPage.confirmDelete', e);
      }
    }
  }
}
