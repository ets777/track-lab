import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { ListForm, ListFormComponent } from 'src/app/components/list-form/list-form.component';
import { ListService } from 'src/app/services/list.service';
import { ToastService } from 'src/app/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IList } from 'src/app/db/models/list';
import { ActionListService } from 'src/app/services/action-list.service';

@Component({
  selector: 'app-list-edit',
  templateUrl: './list-edit.page.html',
  styleUrls: ['./list-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, BackButtonComponent, TranslateModule, ListFormComponent],
})
export class ListEditPage {
  private route = inject(ActivatedRoute);
  private listService = inject(ListService);
  private actionListService = inject(ActionListService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('updateFormRef') updateFormRef!: ListFormComponent;

  listId: number;
  list?: IList;

  constructor() {
    this.listId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.list = await this.listService.getById(this.listId);
    this.cdr.detectChanges();

    const actionLists = await this.actionListService.getAllWhereEquals('listId', this.listId);
    if (actionLists.length > 0) {
      await this.updateFormRef.setItemByActionId(actionLists[0].actionId);
    }
  }

  async updateList(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const listFormValue = this.updateFormRef.listForm.value as ListForm;
    await this.listService.update(this.listId, {
      name: this.list?.isBase ? this.list.name : listFormValue.name,
      isHidden: listFormValue.isHidden,
    });

    await this.actionListService.delete({ listId: this.listId });
    if (listFormValue.item?.type === 'action' && listFormValue.item.itemId) {
      await this.actionListService.add({ actionId: listFormValue.item.itemId, listId: this.listId });
    }

    this.toastService.enqueue({
      title: 'TK_LIST_UPDATED_SUCCESSFULLY',
      type: 'success',
    });

    await this.router.navigate(['/library']);
  }

  isFormValid() {
    return this.updateFormRef?.listForm?.valid;
  }
}
