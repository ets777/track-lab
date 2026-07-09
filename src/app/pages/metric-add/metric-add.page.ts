import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MetricForm, MetricFormComponent } from 'src/app/components/metric-form/metric-form.component';
import { MetricService } from 'src/app/services/metric.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';

@Component({
  selector: 'app-metric-add',
  templateUrl: './metric-add.page.html',
  styleUrls: ['./metric-add.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, MetricFormComponent, NavButtonComponent],
})
export class MetricAddPage {
  private metricService = inject(MetricService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: MetricFormComponent;

  async addMetric(): Promise<void> {
    if (!(await this.addFormRef.validate())) {
      return;
    }

    const metricFormValue = this.addFormRef.metricForm.value as MetricForm;
    const links = this.addFormRef.getResolvedLinks();

    await this.metricService.addFromForm(metricFormValue, links);
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_METRIC_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
