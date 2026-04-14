import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-streak-view',
  templateUrl: './streak-view.page.html',
  styleUrls: ['./streak-view.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, CommonModule, TranslateModule, BackButtonComponent],
})
export class StreakViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private streakService = inject(StreakService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);

  streakId: number;
  streak?: IStreak;
  actions: IActionDb[] = [];
  tags: ITag[] = [];
  items: IItem[] = [];

  actionSheetButtons = [
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  constructor() {
    this.streakId = Number(this.route.snapshot.paramMap.get('id'));
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
        await this.router.navigate(['/streak/edit', this.streakId]);
        break;
      case 'delete':
        await this.deleteStreak();
        break;
    }
  }

  async deleteStreak() {
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
      await this.streakService.delete({ id: this.streakId });
      this.toastService.enqueue({ title: 'TK_STREAK_DELETED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/streak']);
    }
  }

  async ionViewDidEnter() {
    const [streak, actions, tags, items] = await Promise.all([
      this.streakService.getById(this.streakId),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
    ]);

    this.streak = streak;
    this.actions = actions;
    this.tags = tags;
    this.items = items;
  }

  getTermName() {
    if (!this.streak) return '';

    if (this.streak.actionId) {
      return this.actions.find(a => a.id === this.streak!.actionId)?.name ?? '';
    }
    if (this.streak.tagId) {
      return this.tags.find(t => t.id === this.streak!.tagId)?.name ?? '';
    }
    if (this.streak.itemId) {
      return this.items.find(t => t.id === this.streak!.itemId)?.name ?? '';
    }

    return '';
  }
}
