import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonMenuButton, IonFab, IonFabButton, IonIcon, IonText, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { IDictionary } from 'src/app/db/models/dictionary';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { OverlayEventDetail } from '@ionic/core';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-dictionary-list',
  templateUrl: './dictionary-list.page.html',
  styleUrls: ['./dictionary-list.page.scss'],
  imports: [IonActionSheet, IonButton, IonText, IonIcon, IonFabButton, IonFab, IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule],
})
export class DictionaryListPage {
  private dictionaryService = inject(DictionaryService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  dictionaries: IDictionary[] = [];

  getDictionaryActionSheetButtons(dictionary: IDictionary) {
    const buttons: any[] = [
      { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
      { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    ];

    if (!dictionary.isBase) {
      buttons.push({
        text: this.translate.instant('TK_DELETE'),
        role: 'destructive',
        data: { action: 'delete' },
      });
    }

    return buttons;
  }

  async ionViewDidEnter() {
    await this.fetchDictionaries();
  }

  async fetchDictionaries() {
    this.dictionaries = await this.dictionaryService.getAll();
  }

  async viewDictionary(id: number) {
    await this.router.navigate(['/dictionary', id]);
  }

  async goTo(path: string) {
    await this.router.navigate([path]);
  }

  async goToAddPage() {
    await this.router.navigate(['/dictionary/add']);
  }

  async doDictionaryAction(event: CustomEvent<OverlayEventDetail>, dictionaryId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/dictionary', dictionaryId]);
        break;
      case 'edit':
        await this.router.navigate(['/dictionary/edit', dictionaryId]);
        break;
      case 'delete':
        await this.deleteDictionary(dictionaryId);
        break;
    }
  }

  async deleteDictionary(dictionaryId: number) {
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
      await this.dictionaryService.delete({ id: dictionaryId });
      this.toastService.enqueue({ title: 'TK_DICTIONARY_DELETED_SUCCESSFULLY', type: 'success' });
      await this.fetchDictionaries();
    }
  }
}
