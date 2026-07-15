import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ExperimentForm, ExperimentFormComponent } from 'src/app/components/experiment-form/experiment-form.component';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { LogService } from 'src/app/services/log.service';

@Component({
  selector: 'app-experiment-add',
  templateUrl: './experiment-add.page.html',
  styleUrls: ['./experiment-add.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, ExperimentFormComponent, NavButtonComponent],
})
export class ExperimentAddPage {
  private experimentService = inject(ExperimentService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);

  @ViewChild('addFormRef') addFormRef!: ExperimentFormComponent;

  async addExperiment(): Promise<void> {
    if (!(await this.addFormRef.validate())) {
      return;
    }

    try {
      const formValue = this.addFormRef.experimentForm.value as ExperimentForm;
      await this.experimentService.addFromForm(formValue, this.addFormRef.entries, this.addFormRef.selectedRuleIds);
      this.resetForm();
      this.toastService.enqueue({ title: 'TK_EXPERIMENT_ADDED_SUCCESSFULLY', type: 'success' });
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentAddPage.addExperiment', e);
    }
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
