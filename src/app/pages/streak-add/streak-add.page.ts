import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { StreakForm, StreakFormComponent } from 'src/app/components/streak-form/streak-form.component';
import { StreakService } from 'src/app/services/streak.service';
import { ToastService } from 'src/app/services/toast.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-streak-add',
  templateUrl: './streak-add.page.html',
  styleUrls: ['./streak-add.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, StreakFormComponent, BackButtonComponent],
})
export class StreakAddPage {
  private streakService = inject(StreakService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: StreakFormComponent;

  async addStreak(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const streakFormValue = this.addFormRef.streakForm.value as StreakForm;

    await this.streakService.addFromForm(streakFormValue);
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_STREAK_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.streakForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
