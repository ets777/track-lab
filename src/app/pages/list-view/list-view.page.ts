import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonButton, IonInput, IonActionSheet, ActionSheetController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OverlayEventDetail } from '@ionic/core';
import { ListService } from 'src/app/services/list.service';
import { ItemService } from 'src/app/services/item.service';
import { IList } from 'src/app/db/models/list';
import { IItem } from 'src/app/db/models/item';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { SubjectReferenceService } from 'src/app/services/subject-reference.service';
import { presentItemInUseAlert, presentListInUseAlert } from 'src/app/functions/subject-usage';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';

@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.page.html',
  styleUrls: ['./list-view.page.scss'],
  imports: [IonInput, IonActionSheet, IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonFab, IonFabButton, IonIcon, IonButton, CommonModule, FormsModule, TranslateModule, NavButtonComponent, DefaultSkeletonComponent],
})
export class ListViewPage {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private listService = inject(ListService);
  private itemService = inject(ItemService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private subjectReferenceService = inject(SubjectReferenceService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);

  listId = 0;
  list?: IList;
  items: IItem[] | null = null;
  searchQuery = '';

  get filteredItems(): IItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    return q ? this.items!.filter(i => i.name.toLowerCase().includes(q)) : this.items!;
  }

  constructor() { addIcons({ searchOutline }); }

  itemActionSheetButtons = [
    { text: this.translate.instant('TK_VIEW'), icon: 'eye-outline', data: { action: 'view' } },
    { text: this.translate.instant('TK_EDIT'), icon: 'create-outline', data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), icon: 'trash-outline', role: 'destructive', data: { action: 'delete' } },
  ];

  getListActionSheetButtons() {
    const buttons: any[] = [
      { text: this.translate.instant('TK_EDIT'), icon: 'create-outline', data: { action: 'edit' } },
    ];
    if (!this.list?.isBase) {
      buttons.push({ text: this.translate.instant('TK_DELETE'), icon: 'trash-outline', role: 'destructive', data: { action: 'delete' } });
    }
    return buttons;
  }

  async openListMenu() {
    const actionSheet = await this.actionSheetCtrl.create({ buttons: this.getListActionSheetButtons() });
    await actionSheet.present();
    const { data } = await actionSheet.onWillDismiss();
    if (data?.action) await this.doListAction(data.action);
  }

  async doListAction(action: string) {
    switch (action) {
      case 'edit':
        await this.router.navigate(['/library/edit', this.listId]);
        break;
      case 'delete':
        await this.deleteList();
        break;
    }
  }

  async deleteList() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'yes') {
      return;
    }

    try {
      // Items go with the list through SQLite's cascade, but rules, experiment
      // indicators and widgets point at them by an id nothing cascades. Refuse
      // rather than silently turning those into ghost rows.
      const blocking = await this.subjectReferenceService.findListItemUsage(this.listId);

      if (blocking) {
        await presentListInUseAlert(this.alertController, this.translate, this.list?.name ?? '', blocking);
        return;
      }

      await this.listService.delete({ id: this.listId });
      this.toastService.enqueue({ title: 'TK_LIST_DELETED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/library']);
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      await this.logService.error('ListViewPage.deleteList', e);
    }
  }

  ionViewWillEnter() {
    this.items = null;
  }

  async ionViewDidEnter() {
    this.items = null;
    this.listId = Number(this.route.snapshot.paramMap.get('id'));
    await new Promise(resolve => setTimeout(resolve));

    const [list, items] = await Promise.all([
      this.listService.getById(this.listId),
      this.itemService.getAllWhereEquals('listId', this.listId),
    ]);

    this.list = list;
    this.items = items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async doItemActionFromSheet(event: CustomEvent<OverlayEventDetail>, itemId: number) {
    const action = event.detail.data?.action;
    if (action) await this.doItemAction(action, itemId);
  }

  async doItemAction(action: string, itemId: number) {
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
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role !== 'yes') {
      return;
    }

    try {
      // Refused while a rule, experiment or widget still points at the item.
      const blocking = await this.itemService.deleteIfUnused(itemId);

      if (blocking) {
        await presentItemInUseAlert(this.alertController, this.translate, blocking);
        return;
      }

      this.toastService.enqueue({ title: 'TK_ITEM_DELETED_SUCCESSFULLY', type: 'success' });
      this.items = this.items!.filter(t => t.id !== itemId);
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      await this.logService.error('ListViewPage.deleteItem', e);
    }
  }

  async goToAddItem() {
    await this.router.navigate(['/item/add'], { queryParams: { listId: this.listId } });
  }
}
