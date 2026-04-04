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
  selector: 'app-item-add',
  templateUrl: './item-add.page.html',
  styleUrls: ['./item-add.page.scss'],
  imports: [IonLabel, IonInput, IonItem, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BackButtonComponent],
})
export class ItemAddPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  private listId = Number(this.route.snapshot.queryParamMap.get('listId'));

  form = this.fb.group({
    name: ['', Validators.required],
  });

  async save() {
    if (this.form.invalid) return;

    await this.itemService.add({ name: this.form.value.name!, listId: this.listId });
    this.toastService.enqueue({ title: 'TK_ITEM_ADDED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/list', this.listId]);
  }

  isFormValid() {
    return this.form.valid;
  }
}
