import { ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivityForm, ActivityFormComponent } from 'src/app/components/activity-form/activity-form.component';
import { ActivityService } from 'src/app/services/activity.service';
import { TranslateModule } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-activity-edit',
  templateUrl: './activity-edit.page.html',
  styleUrls: ['./activity-edit.page.scss'],
  standalone: true,
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ActivityFormComponent, TranslateModule, BackButtonComponent],
})
export class ActivityEditPage {
  private route = inject(ActivatedRoute);
  private activityService = inject(ActivityService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('updateFormRef') updateFormRef!: ActivityFormComponent;

  activityId: number;
  activity?: IActivity;

  constructor() {
    this.activityId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.activity = await this.activityService.getEnriched(this.activityId);
    this.cdr.detectChanges();
  }

  async updateActivity(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const activityFormValue = this.updateFormRef.activityForm.value as ActivityForm;
    await this.activityService.updateWithTerms(
      this.activityId,
      activityFormValue,
    );

    this.toastService.enqueue({
      title: 'TK_ACTIVITY_UPDATED_SUCCESSFULLY',
      type: 'success',
    });

    await this.router.navigate(
      ['/activity'],
      { queryParams: { date: activityFormValue.date } },
    );
  }

  isFormValid() {
    return this.updateFormRef?.activityForm?.valid;
  }
}
