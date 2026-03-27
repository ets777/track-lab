import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MetricForm, MetricFormComponent } from 'src/app/components/metric-form/metric-form.component';
import { MetricService } from 'src/app/services/metric.service';
import { ToastService } from 'src/app/services/toast.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-metric-add',
  templateUrl: './metric-add.page.html',
  styleUrls: ['./metric-add.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, MetricFormComponent, BackButtonComponent],
})
export class MetricAddPage {
  private metricService = inject(MetricService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: MetricFormComponent;

  async addMetric(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const metricFormValue = this.addFormRef.metricForm.value as MetricForm;

    await this.metricService.addFromForm(metricFormValue);
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTION_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.metricForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
