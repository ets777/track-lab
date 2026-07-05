import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { ListForm, ListFormComponent } from 'src/app/components/list-form/list-form.component';
import { ToastService } from 'src/app/services/toast.service';
import { ListService } from 'src/app/services/list.service';
import { ListLinkService } from 'src/app/services/list-link.service';
import { HookService } from 'src/app/services/hook.service';

@Component({
  selector: 'app-list-add',
  templateUrl: './list-add.page.html',
  styleUrls: ['./list-add.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, NavButtonComponent, TranslateModule, ListFormComponent],
})
export class ListAddPage {
  private toastService = inject(ToastService);
  private listService = inject(ListService);
  private listLinkService = inject(ListLinkService);
  private hookService = inject(HookService);

  @ViewChild('addFormRef') addFormRef!: ListFormComponent;

  async addList(): Promise<void> {
    if (!(await this.addFormRef.validate())) {
      return;
    }

    const listFormValue = this.addFormRef.listForm.value as ListForm;

    const listId = await this.listService.add({ name: listFormValue.name, isHidden: listFormValue.isHidden ?? false });

    const links = this.addFormRef.getResolvedLinks();
    if (links.length) {
      await this.listLinkService.bulkAdd(
        links.map((link) => ({ listId, subjectType: link.type, subjectId: link.itemId })),
      );
    }

    this.hookService.emit({ type: 'list.added', payload: {} });
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTION_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
