import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { TermService } from 'src/app/services/term.service';
import { IDictionary } from 'src/app/db/models/dictionary';
import { ITerm } from 'src/app/db/models/term';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { OverlayEventDetail } from '@ionic/core';

@Component({
  selector: 'app-dictionary-view',
  templateUrl: './dictionary-view.page.html',
  styleUrls: ['./dictionary-view.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet, CommonModule, TranslateModule, BackButtonComponent],
})
export class DictionaryViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dictionaryService = inject(DictionaryService);
  private termService = inject(TermService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  dictionaryId = Number(this.route.snapshot.paramMap.get('id'));
  dictionary?: IDictionary;
  terms: ITerm[] = [];

  termActionSheetButtons = [
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  async ionViewDidEnter() {
    const [dictionary, terms] = await Promise.all([
      this.dictionaryService.getById(this.dictionaryId),
      this.termService.getAllWhereEquals('dictionaryId', this.dictionaryId),
    ]);

    this.dictionary = dictionary;
    this.terms = terms.sort((a, b) => a.name.localeCompare(b.name));
  }

  async doTermAction(event: CustomEvent<OverlayEventDetail>, termId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'edit':
        await this.router.navigate(['/term/edit', termId]);
        break;
      case 'delete':
        await this.deleteTerm(termId);
        break;
    }
  }

  async deleteTerm(termId: number) {
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
      await this.termService.delete({ id: termId });
      this.toastService.enqueue({ title: 'TK_TERM_DELETED_SUCCESSFULLY', type: 'success' });
      this.terms = this.terms.filter(t => t.id !== termId);
    }
  }

  async goToAddTerm() {
    await this.router.navigate(['/term/add'], { queryParams: { dictionaryId: this.dictionaryId } });
  }
}
