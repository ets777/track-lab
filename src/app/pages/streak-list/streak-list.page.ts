import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonMenuButton, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';
import { Router } from '@angular/router';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { OverlayEventDetail } from '@ionic/core';

@Component({
  selector: 'app-streak-list',
  templateUrl: './streak-list.page.html',
  styleUrls: ['./streak-list.page.scss'],
  imports: [IonIcon, IonFabButton, IonFab, IonButtons, IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton, IonButton, IonActionSheet],
})
export class StreakListPage {
  private streakService = inject(StreakService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  streaks: IStreak[] = [];
  actions: IActionDb[] = [];
  tags: ITag[] = [];
  items: IItem[] = [];

  streakActionSheetButtons = [
    { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    await this.fetchStreaks();
    await this.fetchActions();
    await this.fetchTags();
    await this.fetchItems();
  }

  async fetchStreaks() {
    this.streaks = await this.streakService.getAll();
  }

  async fetchActions() {
    this.actions = await this.actionService.getAll();
  }

  async fetchTags() {
    this.tags = await this.tagService.getAll();
  }

  async fetchItems() {
    this.items = await this.itemService.getAll();
  }

  getTermName(streak: IStreak) {
    if (streak.actionId) {
      const action = this.actions.find((action) => action.id == streak.actionId)
      return action?.name;
    }

    if (streak.tagId) {
      const tag = this.tags.find((tag) => tag.id == streak.tagId)
      return tag?.name;
    }

    if (streak.itemId) {
      const item = this.items.find((item) => item.id == streak.itemId)
      return item?.name;
    }

    return '';
  }

  async doStreakAction(event: CustomEvent<OverlayEventDetail>, streakId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/streak', streakId]);
        break;
      case 'edit':
        await this.router.navigate(['/streak/edit', streakId]);
        break;
      case 'delete':
        await this.deleteStreak(streakId);
        break;
    }
  }

  async deleteStreak(streakId: number) {
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
      await this.streakService.delete({ id: streakId });
      this.toastService.enqueue({ title: 'TK_STREAK_DELETED_SUCCESSFULLY', type: 'success' });
      this.streaks = this.streaks.filter(s => s.id !== streakId);
    }
  }

  async goToAddPage() {
    await this.router.navigate(['/streak/add']);
  }
}
