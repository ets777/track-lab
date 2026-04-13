import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonMenuButton, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IRule } from 'src/app/db/models/rule';
import { RuleService } from 'src/app/services/rule.service';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { OverlayEventDetail } from '@ionic/core';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';

@Component({
  selector: 'app-rule-list',
  templateUrl: './rule-list.page.html',
  styleUrls: ['./rule-list.page.scss'],
  imports: [IonIcon, IonFabButton, IonFab, IonButtons, IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton, IonButton, IonActionSheet],
})
export class RuleListPage {
  private ruleService = inject(RuleService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  rules: IRule[] = [];
  private actions: IActionDb[] = [];
  private tags: ITag[] = [];
  private items: IItem[] = [];

  ruleActionSheetButtons = [
    { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    [this.rules, this.actions, this.tags, this.items] = await Promise.all([
      this.ruleService.getAll(),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
    ]);
  }

  getRuleName(rule: IRule): string {
    const subjectName = this.resolveSubjectName(rule);
    return this.ruleService.buildName(rule, subjectName);
  }

  private resolveSubjectName(rule: IRule): string {
    if (rule.subjectType === 'action') {
      return this.actions.find(a => a.id === rule.subjectId)?.name ?? '';
    }
    if (rule.subjectType === 'tag') {
      return this.tags.find(t => t.id === rule.subjectId)?.name ?? '';
    }
    return this.items.find(i => i.id === rule.subjectId)?.name ?? '';
  }

  async doRuleAction(event: CustomEvent<OverlayEventDetail>, ruleId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/rule', ruleId]);
        break;
      case 'edit':
        await this.router.navigate(['/rule/edit', ruleId]);
        break;
      case 'delete':
        await this.deleteRule(ruleId);
        break;
    }
  }

  async deleteRule(ruleId: number) {
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
      await this.ruleService.delete({ id: ruleId });
      this.toastService.enqueue({ title: 'TK_RULE_DELETED_SUCCESSFULLY', type: 'success' });
      this.rules = this.rules.filter((r) => r.id !== ruleId);
    }
  }

  async goToViewPage(ruleId: number) {
    await this.router.navigate(['/rule', ruleId]);
  }

  async goToAddPage() {
    await this.router.navigate(['/rule/add']);
  }
}
