import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentEntry, ExperimentForm, ExperimentFormComponent } from 'src/app/components/experiment-form/experiment-form.component';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ExperimentIndicatorService } from 'src/app/services/experiment-indicator.service';
import { ExperimentRuleService } from 'src/app/services/experiment-rule.service';
import { IExperiment } from 'src/app/db/models/experiment';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';

@Component({
  selector: 'app-experiment-edit',
  templateUrl: './experiment-edit.page.html',
  styleUrls: ['./experiment-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BackButtonComponent, ExperimentFormComponent],
})
export class ExperimentEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private experimentService = inject(ExperimentService);
  private experimentIndicatorService = inject(ExperimentIndicatorService);
  private experimentRuleService = inject(ExperimentRuleService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editFormRef') editFormRef!: ExperimentFormComponent;

  experimentId: number;
  experiment?: IExperiment;
  initialEntries: ExperimentEntry[] = [];
  initialRuleIds: number[] = [];

  constructor() {
    this.experimentId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    try {
      const [experiment, indicators, rules] = await Promise.all([
        this.experimentService.getById(this.experimentId),
        this.experimentIndicatorService.getByExperimentId(this.experimentId),
        this.experimentRuleService.getByExperimentId(this.experimentId),
      ]);
      this.experiment = experiment;
      this.initialEntries = indicators.map(i => ({ type: i.subjectType as ExperimentEntry['type'], subjectId: i.subjectId, direction: i.direction }));
      this.initialRuleIds = rules.map(r => r.ruleId);
      this.cdr.detectChanges();
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentEditPage.ionViewDidEnter', e);
    }
  }

  isFormValid() {
    return this.editFormRef?.experimentForm?.valid;
  }

  async saveExperiment() {
    if (!this.isFormValid()) return;

    try {
      const form = this.editFormRef.experimentForm.value as ExperimentForm;
      await this.experimentService.updateFromForm(this.experimentId, form, this.editFormRef.entries, this.editFormRef.selectedRuleIds);
      this.toastService.enqueue({ title: 'TK_EXPERIMENT_UPDATED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/experiment']);
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentEditPage.saveExperiment', e);
    }
  }
}
