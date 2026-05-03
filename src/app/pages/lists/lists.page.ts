import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonMenuButton, IonFab, IonFabButton, IonIcon, IonText, IonButton, IonActionSheet, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { NavigationService } from 'src/app/services/navigation.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ListService } from 'src/app/services/list.service';
import { IList } from 'src/app/db/models/list';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { OverlayEventDetail } from '@ionic/core';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';

@Component({
  selector: 'app-lists',
  templateUrl: './lists.page.html',
  styleUrls: ['./lists.page.scss'],
  imports: [IonInput, IonActionSheet, IonButton, IonText, IonIcon, IonFabButton, IonFab, IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule, DefaultSkeletonComponent, BackButtonComponent],
})
export class ListsPage {
  private listService = inject(ListService);
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private translate = inject(TranslateService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  constructor() { addIcons({ searchOutline }); }

  lists: IList[] | null = null;
  searchQuery = '';

  get showBackButton(): boolean {
    return this.navigationService.fromDashboard;
  }

  get showActions(): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    return !q || this.translate.instant('TK_ACTIONS').toLowerCase().includes(q);
  }

  get showTags(): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    return !q || this.translate.instant('TK_TAGS').toLowerCase().includes(q);
  }

  get filteredLists(): IList[] {
    const q = this.searchQuery.trim().toLowerCase();
    return q ? (this.lists ?? []).filter(l => l.name.toLowerCase().includes(q)) : (this.lists ?? []);
  }

  getListActionSheetButtons(list: IList) {
    const buttons: any[] = [
      { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
      { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    ];

    if (!list.isBase) {
      buttons.push({
        text: this.translate.instant('TK_DELETE'),
        role: 'destructive',
        data: { action: 'delete' },
      });
    }

    return buttons;
  }

  ionViewWillEnter() {
    this.lists = null;
  }

  async ionViewDidEnter() {
    this.lists = null;
    await new Promise(resolve => setTimeout(resolve));
    this.lists = await this.listService.getAll();
  }

  async fetchLists() {
    this.lists = await this.listService.getAll();
  }

  async viewList(id: number) {
    await this.router.navigate(['/library', id]);
  }

  async goTo(path: string) {
    await this.router.navigate([path]);
  }

  async goToAddPage() {
    await this.router.navigate(['/library/add']);
  }

  async doListAction(event: CustomEvent<OverlayEventDetail>, listId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/library', listId]);
        break;
      case 'edit':
        await this.router.navigate(['/library/edit', listId]);
        break;
      case 'delete':
        await this.deleteList(listId);
        break;
    }
  }

  async deleteList(listId: number) {
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
      await this.listService.delete({ id: listId });
      this.toastService.enqueue({ title: 'TK_LIST_DELETED_SUCCESSFULLY', type: 'success' });
      await this.fetchLists();
    }
  }
}
