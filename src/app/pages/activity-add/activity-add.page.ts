import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { addDays, format, parseISO } from 'date-fns';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonFooter } from "@ionic/angular/standalone";
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityForm, ActivityFormComponent } from "src/app/components/activity-form/activity-form.component";
import { Time } from 'src/app/Time';
import { TranslateModule } from '@ngx-translate/core';
import { App } from '@capacitor/app';
import { ToastService } from 'src/app/services/toast.service';
import { ActivityMetricService } from 'src/app/services/activity-metric.service';
import { ItemService } from 'src/app/services/item.service';
import { ActivityItemService } from 'src/app/services/activity-item.service';
import { HookService } from 'src/app/services/hook.service';

@Component({
  selector: 'app-activity-add',
  templateUrl: './activity-add.page.html',
  styleUrl: './activity-add.page.scss',
  imports: [IonFooter, IonContent, IonHeader, IonToolbar, IonTitle, FormsModule, ReactiveFormsModule, ActivityFormComponent, TranslateModule, NavButtonComponent],
})
export class ActivityAddPage implements OnInit {
  private activityService = inject(ActivityService);
  private toastService = inject(ToastService);
  private activityMetricService = inject(ActivityMetricService);
  private itemService = inject(ItemService);
  private activityItemService = inject(ActivityItemService);
  private hookService = inject(HookService);

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

    const t = () => `[${Date.now() % 100000}ms]`;

    const activityFormValue = this.getForm().value as ActivityForm;
    const activityId = await this.activityService.addFromForm(activityFormValue);

    if (activityId != null) {
      const metricRecords = this.addFormRef.getMetricRecords();
      if (metricRecords.length > 0) {
        await this.activityMetricService.bulkAdd(
          metricRecords.map(r => ({ activityId, metricId: r.metricId, value: r.value }))
        );
        this.hookService.emit({ type: 'activity.metricsAdded', payload: {} });
      }

      let newItemsAdded = false;
      const activityItemDtos: { activityId: number; itemId: number }[] = [];
      for (const record of this.addFormRef.getListItemRecords()) {
        const existingItems = await this.itemService.getAllWhereEquals('listId', record.listId);
        for (const itemName of record.itemNames) {
          const existing = existingItems.find(t => t.name.toLowerCase() === itemName.toLowerCase());
          const itemId = existing ? existing.id! : await this.itemService.add({ name: itemName, listId: record.listId });
          if (!existing) newItemsAdded = true;
          activityItemDtos.push({ activityId, itemId });
        }
      }
      if (activityItemDtos.length > 0) {
        await this.activityItemService.bulkAdd(activityItemDtos);
      }
      if (newItemsAdded) {
        this.hookService.emit({ type: 'item.added', payload: {} });
      }
    }

    await this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTIVITY_ADDED_SUCCESSFULLY',
      type: 'success',
    });
    console.log(t(), 'addActivity: complete');
  }

  isFormValid() {
    return this.getForm()?.valid && this.addFormRef?.isMetricsFormValid();
  }

  async resetForm() {
    const form = this.getForm();
    const date = form?.get('date')?.value;
    const startTime = form?.get('startTime')?.value;
    const endTime = form?.get('endTime')?.value;
    const crossedMidnight = date && startTime && endTime && endTime < startTime;
    const nextDate = crossedMidnight ? format(addDays(parseISO(date), 1), 'yyyy-MM-dd') : date;
    form?.get('endTime')?.markAsUntouched();
    await this.addFormRef?.setDefaultData();
    this.getForm()?.patchValue({
      ...(nextDate ? { date: nextDate } : {}),
      ...(endTime ? { startTime: endTime, endTime } : {}),
    });
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
