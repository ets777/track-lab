import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonList, IonItem, IonIcon, IonButtons, IonButton, IonActionSheet, IonFab, IonFabButton, IonMenuButton, IonNote } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TermService } from 'src/app/services/term.service';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { OverlayEventDetail } from '@ionic/core';
import { Router } from '@angular/router';
import { ITerm } from 'src/app/db/models/term';
import { IDictionary } from 'src/app/db/models/dictionary';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';

interface ITermWithDictionary extends ITerm {
  dictionaryName: string;
}

@Component({
  selector: 'app-term-list',
  templateUrl: './term-list.page.html',
  styleUrls: ['./term-list.page.scss'],
  imports: [IonNote, IonFabButton, IonFab, IonActionSheet, IonButton, IonButtons, IonIcon, IonItem, IonList, IonLabel, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton],
})
export class TermListPage {
  private termService = inject(TermService);
  private dictionaryService = inject(DictionaryService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  terms: ITermWithDictionary[] = [];

  public termActionSheetButtons = [
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    await this.fetchTerms();
  }

  async fetchTerms() {
    const [allTerms, dictionaries] = await Promise.all([
      this.termService.getAll(),
      this.dictionaryService.getAll(),
    ]);

    const dictMap = new Map<number, IDictionary>(dictionaries.map(d => [d.id, d]));

    this.terms = allTerms
      .map(t => ({
        ...t,
        dictionaryName: this.translate.instant(dictMap.get(t.dictionaryId)?.name ?? ''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async doTermAction(event: CustomEvent<OverlayEventDetail>, termId: number) {
    const action = event.detail.data?.action;

    if (action === 'delete') {
      await this.deleteTerm(termId);
    }
  }

  async deleteTerm(termId: number) {
    if (await this.confirm()) {
      await this.termService.delete({ id: termId });
      this.toastService.enqueue({ title: 'TK_TERM_DELETED_SUCCESSFULLY', type: 'success' });
      await this.fetchTerms();
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
