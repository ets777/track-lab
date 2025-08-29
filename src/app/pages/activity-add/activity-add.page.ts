import { Component, ViewChild } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons } from "@ionic/angular/standalone";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityFormComponent } from "src/app/components/activity-form/activity-form.component";
import { Time } from 'src/app/Time';
import { IActivityDTO } from 'src/app/db';

@Component({
  selector: 'app-activity-add',
  templateUrl: './activity-add.page.html',
  styleUrl: './activity-add.page.scss',
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonToolbar, IonTitle, FormsModule, ReactiveFormsModule, ActivityFormComponent],
})
export class ActivityAddPage {
  @ViewChild('addFormRef') addFormRef!: ActivityFormComponent;

  constructor(
    private activityService: ActivityService,
  ) { }

  async ionViewDidEnter() {
    const currentTime = new Time().toString().slice(0, 5);
    
    this.addFormRef?.activityForm?.patchValue({
      endTime: currentTime,
    });
  }

  async addActivity(): Promise<void> {
    if (this.isFormValid()) {
      const activity: IActivityDTO = this.addFormRef.activityForm.value;
      await this.activityService.add(activity);
      await this.resetForm();
    }
  }

  isFormValid() {
    return this.addFormRef?.activityForm?.valid;
  }

  async resetForm() {
    await this.addFormRef?.setDefaultData();
  }
}
