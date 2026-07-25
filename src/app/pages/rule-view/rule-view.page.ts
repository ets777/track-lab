import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { IRule, RulePeriod } from 'src/app/db/models/rule';
import { RuleService } from 'src/app/services/rule.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { RuleCalendarComponent } from 'src/app/components/rule-calendar/rule-calendar.component';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { formatDisplayDate } from 'src/app/functions/date';

const PERIOD_KEY: Record<RulePeriod, string> = {
  day: 'TK_DAILY',
  week: 'TK_WEEKLY',
  month: 'TK_MONTHLY',
};

@Component({
  selector: 'app-rule-view',
  templateUrl: './rule-view.page.html',
  styleUrls: ['./rule-view.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, CommonModule, TranslateModule, NavButtonComponent, RuleCalendarComponent, DefaultSkeletonComponent],
})
export class RuleViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ruleService = inject(RuleService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private logService = inject(LogService);

  isLoading = true;
  ruleId: number;
  rule?: IRule;
  ruleName = '';
  subjectName = '';
  listName = '';

  constructor() {
    this.ruleId = Number(this.route.snapshot.paramMap.get('id'));
    addIcons({ chevronForwardOutline });
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    try {
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
    } catch (error) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      await this.logService.error('RuleViewPage.ionViewDidEnter', error);
    } finally {
      this.isLoading = false;
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
      await this.ruleService.deleteWithRelations(this.ruleId);
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

  get formattedEndDate(): string {
    return this.rule?.endDate ? formatDisplayDate(this.rule.endDate, this.translate.currentLang) : '';
  }

  get periodLabel(): string {
    return this.rule ? this.translate.instant(PERIOD_KEY[this.rule.period]) : '';
  }

  get conditionLabel(): string {
    return this.rule ? this.ruleService.buildCondition(this.rule) : '';
  }

  async openSubject() {
    if (!this.rule) return;
    const route: Record<IRule['subjectType'], string> = { action: '/action', tag: '/tag', item: '/item' };
    await this.router.navigate([route[this.rule.subjectType], this.rule.subjectId]);
  }
}
