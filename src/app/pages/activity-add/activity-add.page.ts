import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons } from "@ionic/angular/standalone";
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityForm, ActivityFormComponent } from "src/app/components/activity-form/activity-form.component";
import { Time } from 'src/app/Time';
import { TranslateModule } from '@ngx-translate/core';
import { App } from '@capacitor/app';
import { ToastService } from 'src/app/services/toast.service';
import { ActivityMetricService } from 'src/app/services/activity-metric.service';
import { ItemService } from 'src/app/services/item.service';
import { ActivityItemService } from 'src/app/services/activity-item.service';

@Component({
  selector: 'app-activity-add',
  templateUrl: './activity-add.page.html',
  styleUrl: './activity-add.page.scss',
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonToolbar, IonTitle, FormsModule, ReactiveFormsModule, ActivityFormComponent, TranslateModule, BackButtonComponent],
})
export class ActivityAddPage implements OnInit {
  private activityService = inject(ActivityService);
  private toastService = inject(ToastService);
  private activityMetricService = inject(ActivityMetricService);
  private itemService = inject(ItemService);
  private activityItemService = inject(ActivityItemService);

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
    await this.addFormRef?.refreshMetricsAndLists();
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
    const activityId = await this.activityService.addFromForm(activityFormValue);

    if (activityId != null) {
      for (const record of this.addFormRef.getMetricRecords()) {
        await this.activityMetricService.add({ activityId, metricId: record.metricId, value: record.value });
      }

      for (const record of this.addFormRef.getListItemRecords()) {
        const existingItems = await this.itemService.getAllWhereEquals('listId', record.listId);
        for (const itemName of record.itemNames) {
          const existing = existingItems.find(t => t.name.toLowerCase() === itemName.toLowerCase());
          const itemId = existing ? existing.id : await this.itemService.add({ name: itemName, listId: record.listId });
          await this.activityItemService.add({ activityId, itemId });
        }
      }
    }

    await this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTIVITY_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.getForm()?.valid && this.addFormRef?.isMetricsFormValid();
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
