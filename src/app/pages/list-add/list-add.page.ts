import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { ListForm, ListFormComponent } from 'src/app/components/list-form/list-form.component';
import { ToastService } from 'src/app/services/toast.service';
import { ListService } from 'src/app/services/list.service';
import { ActionListService } from 'src/app/services/action-list.service';

@Component({
  selector: 'app-list-add',
  templateUrl: './list-add.page.html',
  styleUrls: ['./list-add.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, BackButtonComponent, TranslateModule, ListFormComponent],
})
export class ListAddPage {
  private toastService = inject(ToastService);
  private listService = inject(ListService);
  private actionListService = inject(ActionListService);

  @ViewChild('addFormRef') addFormRef!: ListFormComponent;

  async addList(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const listFormValue = this.addFormRef.listForm.value as ListForm;

    const listId = await this.listService.add({ name: listFormValue.name, isHidden: listFormValue.isHidden ?? false });
    if (listFormValue.item?.type === 'action' && listFormValue.item.itemId) {
      await this.actionListService.add({ actionId: listFormValue.item.itemId, listId });
    }
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTION_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.listForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
