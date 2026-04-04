import { ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivityForm, ActivityFormComponent } from 'src/app/components/activity-form/activity-form.component';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityMetricService } from 'src/app/services/activity-metric.service';
import { TranslateModule } from '@ngx-translate/core';
import { IActivity } from 'src/app/db/models/activity';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';
import { ItemService } from 'src/app/services/item.service';
import { ActivityItemService } from 'src/app/services/activity-item.service';

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
  private activityMetricService = inject(ActivityMetricService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private itemService = inject(ItemService);
  private activityItemService = inject(ActivityItemService);

  @ViewChild('updateFormRef') updateFormRef!: ActivityFormComponent;

  activityId: number;
  activity?: IActivity;
  activityMetricValues: Record<number, number> = {};
  activityItemValues: Record<number, string> = {};

  constructor() {
    this.activityId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    const [activity, metricRecords, items] = await Promise.all([
      this.activityService.getEnriched(this.activityId),
      this.activityMetricService.getByActivityId(this.activityId),
      this.itemService.getByActivityId(this.activityId),
    ]);
    this.activity = activity;
    this.activityMetricValues = Object.fromEntries(metricRecords.map(r => [r.metricId, r.value]));

    const itemsByList: Record<number, string[]> = {};
    for (const item of items) {
      if (!itemsByList[item.listId]) {
        itemsByList[item.listId] = [];
      }
      itemsByList[item.listId].push(item.name);
    }
    this.activityItemValues = Object.fromEntries(
      Object.entries(itemsByList).map(([lId, names]) => [Number(lId), names.join(', ')])
    );

    this.cdr.detectChanges();
    await this.updateFormRef?.refreshMetricsAndLists();
  }

  async updateActivity(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const activityFormValue = this.updateFormRef.activityForm.value as ActivityForm;
    await this.activityService.updateWithItems(this.activityId, activityFormValue);

    await this.activityMetricService.delete({ activityId: this.activityId });
    for (const record of this.updateFormRef.getMetricRecords()) {
      await this.activityMetricService.add({ activityId: this.activityId, metricId: record.metricId, value: record.value });
    }

    await this.activityItemService.delete({ activityId: this.activityId });
    for (const record of this.updateFormRef.getListItemRecords()) {
      const existingItems = await this.itemService.getAllWhereEquals('listId', record.listId);
      for (const itemName of record.itemNames) {
        const existing = existingItems.find(t => t.name.toLowerCase() === itemName.toLowerCase());
        const itemId = existing ? existing.id : await this.itemService.add({ name: itemName, listId: record.listId });
        await this.activityItemService.add({ activityId: this.activityId, itemId });
      }
    }

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
    return this.updateFormRef?.activityForm?.valid && this.updateFormRef?.isMetricsFormValid();
  }
}
