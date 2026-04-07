import { ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MetricForm, MetricFormComponent } from 'src/app/components/metric-form/metric-form.component';
import { MetricService } from 'src/app/services/metric.service';
import { ActionMetricService } from 'src/app/services/action-metric.service';
import { TagMetricService } from 'src/app/services/tag-metric.service';
import { ItemMetricService } from 'src/app/services/item-metric.service';
import { IMetric } from 'src/app/db/models/metric';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';
import { ActivityMetricService } from 'src/app/services/activity-metric.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-metric-edit',
  templateUrl: './metric-edit.page.html',
  styleUrls: ['./metric-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BackButtonComponent, MetricFormComponent],
})
export class MetricEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private metricService = inject(MetricService);
  private actionMetricService = inject(ActionMetricService);
  private tagMetricService = inject(TagMetricService);
  private itemMetricService = inject(ItemMetricService);
  private toastService = inject(ToastService);
  private activityMetricService = inject(ActivityMetricService);
  private alertController = inject(AlertController);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editFormRef') editFormRef!: MetricFormComponent;

  metricId: number;
  metric?: IMetric;

  constructor() {
    this.metricId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.metric = await this.metricService.getById(this.metricId);
    this.cdr.detectChanges();
  }

  isFormValid() {
    return this.editFormRef?.metricForm?.valid;
  }

  async saveMetric() {
    if (!this.isFormValid()) return;

    const form = this.editFormRef.metricForm.value as MetricForm;
    const newMin = Number(form.minValue);
    const newMax = Number(form.maxValue);

    if (newMax !== this.metric!.maxValue) {
      const above = await this.activityMetricService.getAboveMaxByMetricId(this.metricId, newMax);
      if (above.length > 0) {
        const result = await this.confirmRangeChange('TK_RECORDS_EXCEED_NEW_MAX', 'TK_YES_AND_CUT_TO_MAX');
        if (result === 'no') return;
        if (result === 'cut') {
          for (const r of above) await this.activityMetricService.update(r.id, { value: newMax });
        }
      }
    }

    if (newMin !== this.metric!.minValue) {
      const below = await this.activityMetricService.getBelowMinByMetricId(this.metricId, newMin);
      if (below.length > 0) {
        const result = await this.confirmRangeChange('TK_RECORDS_BELOW_NEW_MIN', 'TK_YES_AND_CUT_TO_MIN');
        if (result === 'no') return;
        if (result === 'cut') {
          for (const r of below) await this.activityMetricService.update(r.id, { value: newMin });
        }
      }
    }

    await this.metricService.update(this.metricId, {
      name: this.metric!.isBase ? this.metric!.name : form.name,
      isHidden: form.isHidden ?? false,
      unit: form.unit || undefined,
      step: Number(form.step ?? 1),
      minValue: newMin,
      maxValue: newMax,
      showPreviousValue: form.showPreviousValue ?? false,
    });

    await this.actionMetricService.delete({ metricId: this.metricId });
    await this.tagMetricService.delete({ metricId: this.metricId });
    await this.itemMetricService.delete({ metricId: this.metricId });
    if (form.term?.type === 'action' && form.term.itemId) {
      await this.actionMetricService.add({ actionId: form.term.itemId, metricId: this.metricId });
    } else if (form.term?.type === 'tag' && form.term.itemId) {
      await this.tagMetricService.add({ tagId: form.term.itemId, metricId: this.metricId });
    } else if (form.term?.itemId) {
      await this.itemMetricService.add({ itemId: form.term.itemId, metricId: this.metricId });
    }

    this.toastService.enqueue({ title: 'TK_METRIC_UPDATED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/metric']);
  }

  private async confirmRangeChange(messageKey: string, cutLabelKey: string): Promise<'yes' | 'cut' | 'no'> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      message: this.translate.instant(messageKey),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant(cutLabelKey), role: 'cut' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return (role as 'yes' | 'cut' | 'no') ?? 'no';
  }
}
