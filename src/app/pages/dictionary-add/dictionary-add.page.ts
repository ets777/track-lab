import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { DictionaryForm, DictionaryFormComponent } from 'src/app/components/dictionary-form/dictionary-form.component';
import { ToastService } from 'src/app/services/toast.service';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { ActionDictionaryService } from 'src/app/services/action-dictionary.service';

@Component({
  selector: 'app-dictionary-add',
  templateUrl: './dictionary-add.page.html',
  styleUrls: ['./dictionary-add.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, BackButtonComponent, TranslateModule, DictionaryFormComponent],
})
export class DictionaryAddPage {
  private toastService = inject(ToastService);
  private dictionaryService = inject(DictionaryService);
  private actionDictionaryService = inject(ActionDictionaryService);

  @ViewChild('addFormRef') addFormRef!: DictionaryFormComponent;

  async addDictionary(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const dictionaryFormValue = this.addFormRef.dictionaryForm.value as DictionaryForm;

    const dictionaryId = await this.dictionaryService.add({ name: dictionaryFormValue.name, isHidden: dictionaryFormValue.isHidden ?? false });
    if (dictionaryFormValue.term?.type === 'action' && dictionaryFormValue.term.termId) {
      await this.actionDictionaryService.add({ actionId: dictionaryFormValue.term.termId, dictionaryId });
    }
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTION_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.dictionaryForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
