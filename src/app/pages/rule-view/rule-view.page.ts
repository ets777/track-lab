import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ellipsisVertical } from 'ionicons/icons';
import { IRule, RuleMetric, RulePeriod } from 'src/app/db/models/rule';
import { RuleService } from 'src/app/services/rule.service';
import { RuleCompletionService } from 'src/app/services/rule-completion.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { RuleCalendarComponent } from 'src/app/components/rule-calendar/rule-calendar.component';
import { ToastService } from 'src/app/services/toast.service';
import { formatDisplayDate } from 'src/app/functions/date';

const METRIC_KEY: Record<RuleMetric, string> = {
  count: 'TK_COUNT',
  totalDuration: 'TK_TOTAL_DURATION',
  countDays: 'TK_COUNT_DAYS',
};

const PERIOD_KEY: Record<RulePeriod, string> = {
  day: 'TK_DAILY',
  week: 'TK_WEEKLY',
  month: 'TK_MONTHLY',
};

@Component({
  selector: 'app-rule-view',
  templateUrl: './rule-view.page.html',
  styleUrls: ['./rule-view.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, CommonModule, TranslateModule, BackButtonComponent, RuleCalendarComponent],
})
export class RuleViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ruleService = inject(RuleService);
  private ruleCompletionService = inject(RuleCompletionService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  ruleId: number;
  rule?: IRule;
  ruleName = '';
  subjectName = '';
  listName = '';

  constructor() {
    this.ruleId = Number(this.route.snapshot.paramMap.get('id'));
    addIcons({ ellipsisVertical });
  }

  async ionViewDidEnter() {
    const [rule, actions, tags, items, lists] = await Promise.all([
      this.ruleService.getById(this.ruleId),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
      this.listService.getAll(),
    ]);

    this.rule = rule;

    if (rule) {
      if (rule.subjectType === 'action') {
        this.subjectName = actions.find(a => a.id === rule.subjectId)?.name ?? '';
      } else if (rule.subjectType === 'tag') {
        this.subjectName = tags.find(t => t.id === rule.subjectId)?.name ?? '';
      } else {
        const item = items.find(i => i.id === rule.subjectId);
        this.subjectName = item?.name ?? '';
        this.listName = lists.find(l => l.id === item?.listId)?.name ?? '';
      }
      this.ruleName = this.ruleService.buildName(rule, this.subjectName);
    }
  }

  async openMenu() {
    const sheet = await this.actionSheetCtrl.create({
      buttons: [
        { text: this.translate.instant('TK_EDIT'), icon: 'create-outline', data: { action: 'edit' } },
        { text: this.translate.instant('TK_DELETE'), icon: 'trash-outline', role: 'destructive', data: { action: 'delete' } },
      ],
    });
    await sheet.present();
    const { data } = await sheet.onWillDismiss();
    if (data?.action === 'edit') {
      await this.router.navigate(['/rule/edit', this.ruleId]);
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
      await this.ruleCompletionService.deleteByRuleId(this.ruleId);
      await this.ruleService.delete({ id: this.ruleId });
      this.toastService.enqueue({ title: 'TK_RULE_DELETED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/rule']);
    }
  }

  get subjectSubtitle(): string {
    if (!this.rule) return '';
    if (this.rule.subjectType === 'action') return this.translate.instant('TK_ACTION');
    if (this.rule.subjectType === 'tag') return this.translate.instant('TK_TAG');
    return this.listName;
  }

  get formattedStartDate(): string {
    return this.rule ? formatDisplayDate(this.rule.startDate, this.translate.currentLang) : '';
  }

  get metricLabel(): string {
    return this.rule ? this.translate.instant(METRIC_KEY[this.rule.metric]) : '';
  }

  get periodLabel(): string {
    return this.rule ? this.translate.instant(PERIOD_KEY[this.rule.period]) : '';
  }

  get conditionLabel(): string {
    if (!this.rule) return '';
    const op = this.translate.instant(this.rule.operator === '>=' ? 'TK_AT_LEAST' : 'TK_AT_MOST');
    return `${op} ${this.rule.value}`;
  }
}
