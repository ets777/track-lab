import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonMenuButton, IonFab, IonFabButton, IonIcon, IonText, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { IDictionary } from 'src/app/db/models/dictionary';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { OverlayEventDetail } from '@ionic/core';

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

  dictionaries: IDictionary[] = [];

  public dictionaryActionSheetButtons = [
    {
      text: this.translate.instant('TK_EDIT'),
      data: {
        action: 'edit',
      },
    },
  ];

  async ionViewDidEnter() {
    await this.fetchDictionaries();
  }

  async fetchDictionaries() {
    this.dictionaries = await this.dictionaryService.getAll();
  }

  async goToAddPage() {
    await this.router.navigate(['/dictionary/add']);
  }

  async doDictionaryAction(event: CustomEvent<OverlayEventDetail>, dictionaryId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'edit':
        await this.router.navigate(['/dictionary/edit', dictionaryId]);
        break;
      default:
        break;
    }
  }
}
