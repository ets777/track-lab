import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonMenuButton, IonFab, IonFabButton, IonIcon, IonText } from '@ionic/angular/standalone';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { IDictionary } from 'src/app/db/models/dictionary';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dictionary-list',
  templateUrl: './dictionary-list.page.html',
  styleUrls: ['./dictionary-list.page.scss'],
  imports: [IonText, IonIcon, IonFabButton, IonFab, IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule],
})
export class DictionaryListPage {
  private dictionaryService = inject(DictionaryService);
  private router = inject(Router);

  dictionaries: IDictionary[] = [];

  async ionViewDidEnter() {
    await this.fetchDictionaries();
  }

  async fetchDictionaries() {
    this.dictionaries = await this.dictionaryService.getAll();
  }

  async goToAddPage() {
    await this.router.navigate(['/dictionary/add']);
  }
}
