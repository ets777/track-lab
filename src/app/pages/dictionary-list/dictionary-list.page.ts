import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonMenuButton } from '@ionic/angular/standalone';
import { DictionaryService } from 'src/app/services/library.service';
import { IDictionary } from 'src/app/db/models/library';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dictionary-list',
  templateUrl: './dictionary-list.page.html',
  styleUrls: ['./dictionary-list.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule],
})
export class DictionaryListPage {
  private dictionaryService = inject(DictionaryService);

  dictionaries: IDictionary[] = [];

  async ionViewDidEnter() {
    await this.fetchDictionaries();
  }

  async fetchDictionaries() {
    this.dictionaries = await this.dictionaryService.getAll();
  }
}
