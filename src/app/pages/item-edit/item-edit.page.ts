import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonItem, IonInput, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService } from 'src/app/services/item.service';
import { ToastService } from 'src/app/services/toast.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-item-edit',
  templateUrl: './item-edit.page.html',
  styleUrls: ['./item-edit.page.scss'],
  imports: [IonLabel, IonInput, IonItem, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BackButtonComponent],
})
export class ItemEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  private itemId = Number(this.route.snapshot.paramMap.get('id'));
  private listId?: number;

  form = this.fb.group({
    name: ['', Validators.required],
  });

  async ionViewDidEnter() {
    const item = await this.itemService.getById(this.itemId);
    if (item) {
      this.listId = item.listId;
      this.form.patchValue({ name: item.name });
    }
  }

  async save() {
    if (this.form.invalid) return;

    await this.itemService.update(this.itemId, { name: this.form.value.name! });
    this.toastService.enqueue({ title: 'TK_ITEM_UPDATED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/library', this.listId]);
  }

  isFormValid() {
    return this.form.valid;
  }
}
