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

@Component({
  selector: 'app-rule-list',
  templateUrl: './rule-list.page.html',
  styleUrls: ['./rule-list.page.scss'],
  imports: [IonIcon, IonFabButton, IonFab, IonButtons, IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton, IonButton, IonActionSheet],
})
export class RuleListPage {
  private ruleService = inject(RuleService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  rules: IRule[] = [];

  ruleActionSheetButtons = [
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    this.rules = await this.ruleService.getAll();
  }

  async doRuleAction(event: CustomEvent<OverlayEventDetail>, ruleId: number) {
    const action = event.detail.data?.action;

    if (action === 'delete') {
      await this.deleteRule(ruleId);
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

  async goToAddPage() {
    await this.router.navigate(['/rule/add']);
  }
}
