import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { ListForm, ListFormComponent } from 'src/app/components/list-form/list-form.component';
import { ListService } from 'src/app/services/list.service';
import { ToastService } from 'src/app/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IList } from 'src/app/db/models/list';
import { ListLinkService } from 'src/app/services/list-link.service';

@Component({
  selector: 'app-list-edit',
  templateUrl: './list-edit.page.html',
  styleUrls: ['./list-edit.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, NavButtonComponent, TranslateModule, ListFormComponent],
})
export class ListEditPage {
  private route = inject(ActivatedRoute);
  private listService = inject(ListService);
  private listLinkService = inject(ListLinkService);
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

    const links = await this.listLinkService.getAllWhereEquals('listId', this.listId);
    if (links.length > 0) {
      await this.updateFormRef.setLinks(links);
    }
  }

  async updateList(): Promise<void> {
    if (!(await this.updateFormRef.validate())) {
      return;
    }

    const listFormValue = this.updateFormRef.listForm.value as ListForm;
    await this.listService.update(this.listId, {
      name: this.list?.isBase ? this.list.name : listFormValue.name,
      isHidden: listFormValue.isHidden,
    });

    await this.listLinkService.delete({ listId: this.listId });
    const links = this.updateFormRef.getResolvedLinks();
    if (links.length) {
      await this.listLinkService.bulkAdd(
        links.map((link) => ({ listId: this.listId, subjectType: link.type, subjectId: link.itemId })),
      );
    }

    this.toastService.enqueue({
      title: 'TK_LIST_UPDATED_SUCCESSFULLY',
      type: 'success',
    });

    await this.router.navigate(['/library']);
  }

}
