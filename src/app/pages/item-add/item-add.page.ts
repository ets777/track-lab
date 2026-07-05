import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService } from 'src/app/services/item.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { HookService } from 'src/app/services/hook.service';
import { ItemForm, ItemFormComponent } from 'src/app/components/item-form/item-form.component';

@Component({
  selector: 'app-item-add',
  templateUrl: './item-add.page.html',
  styleUrls: ['./item-add.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, NavButtonComponent, ItemFormComponent],
})
export class ItemAddPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  private hookService = inject(HookService);

  @ViewChild('addFormRef') addFormRef!: ItemFormComponent;

  listId = Number(this.route.snapshot.queryParamMap.get('listId'));

  async save() {
    if (!(await this.addFormRef.validate())) {
      return;
    }

    const itemFormValue = this.addFormRef.itemForm.value as ItemForm;

    await this.itemService.add({ name: itemFormValue.name, listId: this.listId });
    this.hookService.emit({ type: 'item.added', payload: {} });
    this.toastService.enqueue({ title: 'TK_ITEM_ADDED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/library', this.listId]);
  }
}
