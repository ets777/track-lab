import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonItem, IonInput, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TermService } from 'src/app/services/term.service';
import { ToastService } from 'src/app/services/toast.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-term-edit',
  templateUrl: './term-edit.page.html',
  styleUrls: ['./term-edit.page.scss'],
  imports: [IonLabel, IonInput, IonItem, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, BackButtonComponent],
})
export class TermEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private termService = inject(TermService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  private termId = Number(this.route.snapshot.paramMap.get('id'));
  private dictionaryId?: number;

  form = this.fb.group({
    name: ['', Validators.required],
  });

  async ionViewDidEnter() {
    const term = await this.termService.getById(this.termId);
    if (term) {
      this.dictionaryId = term.dictionaryId;
      this.form.patchValue({ name: term.name });
    }
  }

  async save() {
    if (this.form.invalid) return;

    await this.termService.update(this.termId, { name: this.form.value.name! });
    this.toastService.enqueue({ title: 'TK_TERM_UPDATED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/dictionary', this.dictionaryId]);
  }

  isFormValid() {
    return this.form.valid;
  }
}
