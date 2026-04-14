import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonList, IonItem, IonIcon, IonButtons, IonButton, IonActionSheet, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActionService } from 'src/app/services/action.service';
import { OverlayEventDetail } from '@ionic/core';
import { Router } from '@angular/router';
import { IAction } from 'src/app/db/models/action';
import { TagsComponent } from "src/app/components/tags/tags.component";
import { AlertController } from '@ionic/angular';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { ToastService } from 'src/app/services/toast.service';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';

@Component({
  selector: 'app-library',
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss'],
  imports: [IonFabButton, IonFab, IonActionSheet, IonButton, IonButtons, IonIcon, IonItem, IonList, IonLabel, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, TagsComponent, BackButtonComponent, DefaultSkeletonComponent],
})
export class LibraryPage {
  private actionService = inject(ActionService);
  private activityActionService = inject(ActivityActionService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  actions: IAction[] = [];
  isLoading = true;

  public actionActionSheetButtons = [
    { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_REPLACE'), data: { action: 'replace' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  ionViewWillEnter() {
    this.isLoading = true;
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    await this.fetchActions();
    this.isLoading = false;
  }

  async fetchActions() {
    this.actions = (await this.actionService.getAllEnriched())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async doActionAction(event: CustomEvent<OverlayEventDetail>, actionId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/action', actionId]);
        break;
      case 'delete':
        await this.deleteAction(actionId);
        break;
      case 'replace':
        await this.replaceAction(actionId);
        break;
      case 'edit':
        await this.router.navigate(['/action/edit', actionId]);
        break;
    }
  }

  async deleteAction(actionId: number) {
    const relations = await this.activityActionService.getByActionId(actionId);

    if (relations.length) {
      const answer = await this.showDeletionError();
      if (answer == 'replace') await this.goToReplacePage(actionId);
      return;
    }

    if (await this.confirm()) {
      await this.actionService.deleteWithRelations(actionId);
      this.toastService.enqueue({ title: 'TK_ACTION_DELETED_SUCCESSFULLY', type: 'success' });
      await this.fetchActions();
    }
  }

  async replaceAction(actionId: number) {
    const relations = await this.activityActionService.getByActionId(actionId);

    if (!relations.length) {
      const answer = await this.showReplacementError();
      if (answer == 'delete') {
        await this.actionService.deleteWithRelations(actionId);
        await this.fetchActions();
      }
      return;
    }

    this.goToReplacePage(actionId);
  }

  async goToReplacePage(actionId: number) {
    await this.router.navigate(['/action/replace', actionId]);
  }

  async showDeletionError() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CAN_T_PROCEED'),
      subHeader: this.translate.instant('TK_THE_ACTION_CAN_T_BE_DELETED_BECAUSE_IT_HAS_OCCURRENCES_IN_THE_ACTIVITIES'),
      buttons: [
        { text: this.translate.instant('TK_REPLACE'), role: 'replace' },
        { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role;
  }

  async showReplacementError() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CAN_T_PROCEED'),
      subHeader: this.translate.instant('TK_THE_ACTION_WAS_NEVER_PERFORMED_THERE_IS_NOTHING_TO_REPLACE'),
      buttons: [
        { text: this.translate.instant('TK_DELETE'), role: 'delete' },
        { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role;
  }

  async confirm() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'yes';
  }

  async goToViewPage(actionId: number) {
    await this.router.navigate(['/action', actionId]);
  }

  async goToAddPage() {
    await this.router.navigate(['/action/add']);
  }
}
