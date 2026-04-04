import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ListService } from 'src/app/services/list.service';
import { ItemService } from 'src/app/services/item.service';
import { IList } from 'src/app/db/models/list';
import { IItem } from 'src/app/db/models/item';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { OverlayEventDetail } from '@ionic/core';

@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.page.html',
  styleUrls: ['./list-view.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet, CommonModule, TranslateModule, BackButtonComponent],
})
export class ListViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listService = inject(ListService);
  private itemService = inject(ItemService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  listId = Number(this.route.snapshot.paramMap.get('id'));
  list?: IList;
  items: IItem[] = [];

  itemActionSheetButtons = [
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    const [list, items] = await Promise.all([
      this.listService.getById(this.listId),
      this.itemService.getAllWhereEquals('listId', this.listId),
    ]);

    this.list = list;
    this.items = items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async doItemAction(event: CustomEvent<OverlayEventDetail>, itemId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'edit':
        await this.router.navigate(['/item/edit', itemId]);
        break;
      case 'delete':
        await this.deleteItem(itemId);
        break;
    }
  }

  async deleteItem(itemId: number) {
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
      await this.itemService.delete({ id: itemId });
      this.toastService.enqueue({ title: 'TK_ITEM_DELETED_SUCCESSFULLY', type: 'success' });
      this.items = this.items.filter(t => t.id !== itemId);
    }
  }

  async goToAddItem() {
    await this.router.navigate(['/item/add'], { queryParams: { listId: this.listId } });
  }
}
