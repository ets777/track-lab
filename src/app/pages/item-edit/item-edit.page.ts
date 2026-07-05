import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService } from 'src/app/services/item.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { IItem } from 'src/app/db/models/item';
import { ItemForm, ItemFormComponent } from 'src/app/components/item-form/item-form.component';

@Component({
  selector: 'app-item-edit',
  templateUrl: './item-edit.page.html',
  styleUrls: ['./item-edit.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, NavButtonComponent, ItemFormComponent],
})
export class ItemEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('updateFormRef') updateFormRef!: ItemFormComponent;

  itemId = Number(this.route.snapshot.paramMap.get('id'));
  item?: IItem;

  async ionViewDidEnter() {
    this.item = await this.itemService.getById(this.itemId);
    this.cdr.detectChanges();
  }

  async save() {
    if (!(await this.updateFormRef.validate())) {
      return;
    }

    const itemFormValue = this.updateFormRef.itemForm.value as ItemForm;

    await this.itemService.update(this.itemId, { name: itemFormValue.name });
    this.toastService.enqueue({ title: 'TK_ITEM_UPDATED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/library', this.item?.listId]);
  }
}
