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
import { TermService } from 'src/app/services/term.service';
import { ActivityTermService } from 'src/app/services/activity-term.service';

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
  private termService = inject(TermService);
  private activityTermService = inject(ActivityTermService);

  @ViewChild('updateFormRef') updateFormRef!: ActivityFormComponent;

  activityId: number;
  activity?: IActivity;
  activityMetricValues: Record<number, number> = {};
  activityTermValues: Record<number, string> = {};

  constructor() {
    this.activityId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    const [activity, metricRecords, terms] = await Promise.all([
      this.activityService.getEnriched(this.activityId),
      this.activityMetricService.getByActivityId(this.activityId),
      this.termService.getByActivityId(this.activityId),
    ]);
    this.activity = activity;
    this.activityMetricValues = Object.fromEntries(metricRecords.map(r => [r.metricId, r.value]));

    const termsByDictionary: Record<number, string[]> = {};
    for (const term of terms) {
      if (!termsByDictionary[term.dictionaryId]) {
        termsByDictionary[term.dictionaryId] = [];
      }
      termsByDictionary[term.dictionaryId].push(term.name);
    }
    this.activityTermValues = Object.fromEntries(
      Object.entries(termsByDictionary).map(([dId, names]) => [Number(dId), names.join(', ')])
    );

    this.cdr.detectChanges();
    await this.updateFormRef?.refreshMetricsAndDictionaries();
  }

  async updateActivity(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const activityFormValue = this.updateFormRef.activityForm.value as ActivityForm;
    await this.activityService.updateWithTerms(this.activityId, activityFormValue);

    await this.activityMetricService.delete({ activityId: this.activityId });
    for (const record of this.updateFormRef.getMetricRecords()) {
      await this.activityMetricService.add({ activityId: this.activityId, metricId: record.metricId, value: record.value });
    }

    await this.activityTermService.delete({ activityId: this.activityId });
    for (const record of this.updateFormRef.getDictionaryTermRecords()) {
      const existingTerms = await this.termService.getAllWhereEquals('dictionaryId', record.dictionaryId);
      for (const termName of record.termNames) {
        const existing = existingTerms.find(t => t.name.toLowerCase() === termName.toLowerCase());
        const termId = existing ? existing.id : await this.termService.add({ name: termName, dictionaryId: record.dictionaryId });
        await this.activityTermService.add({ activityId: this.activityId, termId });
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
