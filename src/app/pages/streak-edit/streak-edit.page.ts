import { ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StreakForm, StreakFormComponent } from 'src/app/components/streak-form/streak-form.component';
import { StreakService } from 'src/app/services/streak.service';
import { IStreak } from 'src/app/db/models/streak';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-streak-edit',
  templateUrl: './streak-edit.page.html',
  styleUrls: ['./streak-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BackButtonComponent, StreakFormComponent],
})
export class StreakEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private streakService = inject(StreakService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editFormRef') editFormRef!: StreakFormComponent;

  streakId: number;
  streak?: IStreak;

  constructor() {
    this.streakId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.streak = await this.streakService.getById(this.streakId);
    this.cdr.detectChanges();
  }

  isFormValid() {
    return this.editFormRef?.streakForm?.valid;
  }

  async saveStreak() {
    if (!this.isFormValid()) return;

    const form = this.editFormRef.streakForm.value as StreakForm;
    await this.streakService.updateFromForm(this.streakId, form);

    this.toastService.enqueue({ title: 'TK_STREAK_UPDATED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/streak']);
  }
}
