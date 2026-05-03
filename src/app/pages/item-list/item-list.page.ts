import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonList, IonItem, IonIcon, IonButtons, IonButton, IonActionSheet, IonFab, IonFabButton, IonMenuButton, IonNote } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { OverlayEventDetail } from '@ionic/core';
import { Router } from '@angular/router';
import { IItem } from 'src/app/db/models/item';
import { IList } from 'src/app/db/models/list';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';

interface IItemWithList extends IItem {
  listName: string;
}

@Component({
  selector: 'app-item-list',
  templateUrl: './item-list.page.html',
  styleUrls: ['./item-list.page.scss'],
  imports: [IonNote, IonActionSheet, IonButton, IonButtons, IonIcon, IonItem, IonList, IonLabel, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton],
})
export class ItemListPage {
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private translate = inject(TranslateService);
  router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  items: IItemWithList[] = [];

  public itemActionSheetButtons = [
    { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    await this.fetchItems();
  }

  async fetchItems() {
    const [allItems, lists] = await Promise.all([
      this.itemService.getAll(),
      this.listService.getAll(),
    ]);

    const listMap = new Map<number, IList>(lists.map(l => [l.id, l]));

    this.items = allItems
      .map(t => ({
        ...t,
        listName: listMap.get(t.listId)?.name ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async doItemAction(event: CustomEvent<OverlayEventDetail>, itemId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/item', itemId]);
        break;
      case 'edit':
        await this.router.navigate(['/item/edit', itemId]);
        break;
      case 'delete':
        await this.deleteItem(itemId);
        break;
    }
  }

  async deleteItem(itemId: number) {
    if (await this.confirm()) {
      await this.itemService.delete({ id: itemId });
      this.toastService.enqueue({ title: 'TK_ITEM_DELETED_SUCCESSFULLY', type: 'success' });
      await this.fetchItems();
    }
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
}
