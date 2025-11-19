import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons } from "@ionic/angular/standalone";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityForm, ActivityFormComponent } from "src/app/components/activity-form/activity-form.component";
import { Time } from 'src/app/Time';
import { TranslateModule } from '@ngx-translate/core';
import { App } from '@capacitor/app';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-activity-add',
  templateUrl: './activity-add.page.html',
  styleUrl: './activity-add.page.scss',
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonToolbar, IonTitle, FormsModule, ReactiveFormsModule, ActivityFormComponent, TranslateModule],
})
export class ActivityAddPage implements OnInit {
  private activityService = inject(ActivityService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: ActivityFormComponent;

  ngOnInit() {
    App.addListener('resume', () => {
      this.updateEndTime();
    });
  }

  async ionViewDidEnter() {
    await this.updateForm();
  }

  async updateForm() {
    this.updateEndTime();
    await this.addFormRef?.fetchAllSuggestions();
    await this.addFormRef?.updateLastActivityData();
  }

  getForm() {
    return this.addFormRef?.activityForm;
  }

  async addActivity(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const activityFormValue = this.getForm().value as ActivityForm;
    await this.activityService.addFromForm(activityFormValue);
    await this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTIVITY_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.getForm()?.valid;
  }

  async resetForm() {
    this.getForm()?.get('endTime')?.markAsUntouched();
    await this.addFormRef?.setDefaultData();
    await this.addFormRef?.fetchAllSuggestions();
  }

  updateEndTime() {
    const isTouched = this.getForm()?.get('endTime')?.touched;

    if (isTouched) {
      return;
    }

    const currentTime = new Time().toString().slice(0, 5);

    this.getForm()?.patchValue({
      endTime: currentTime,
    });
  }
}
