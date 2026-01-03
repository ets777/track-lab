import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { DictionaryForm, DictionaryFormComponent } from 'src/app/components/dictionary-form/dictionary-form.component';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { ToastService } from 'src/app/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IDictionary } from 'src/app/db/models/dictionary';

@Component({
  selector: 'app-dictionary-edit',
  templateUrl: './dictionary-edit.page.html',
  styleUrls: ['./dictionary-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, BackButtonComponent, TranslateModule, DictionaryFormComponent],
})
export class DictionaryEditPage {
  private route = inject(ActivatedRoute);
  private dictionaryService = inject(DictionaryService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('updateFormRef') updateFormRef!: DictionaryFormComponent;

  dictionaryId: number;
  dictionary?: IDictionary;

  constructor() {
    this.dictionaryId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.dictionary = await this.dictionaryService.getById(this.dictionaryId);
    this.cdr.detectChanges();
  }

  async updateDictionary(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const actionFormValue = this.updateFormRef.dictionaryForm.value as DictionaryForm;
    await this.dictionaryService.update(this.dictionaryId, actionFormValue);

    this.toastService.enqueue({
      title: 'TK_DICTIONARY_UPDATED_SUCCESSFULLY',
      type: 'success',
    });

    await this.router.navigate(['/dictionary']);
  }

  isFormValid() {
    return this.updateFormRef?.dictionaryForm?.valid;
  }
}
