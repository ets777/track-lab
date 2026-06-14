import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonMenuButton, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet, IonText, IonSegment, IonSegmentButton, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IExperiment } from 'src/app/db/models/experiment';
import { ExperimentService } from 'src/app/services/experiment.service';
import { Router } from '@angular/router';
import { NavigationService } from 'src/app/services/navigation.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { OverlayEventDetail } from '@ionic/core';
import { LogService } from 'src/app/services/log.service';
import { formatDisplayDate } from 'src/app/functions/date';

type Tab = 'in-progress' | 'success' | 'failed';

@Component({
  selector: 'app-experiment-list',
  templateUrl: './experiment-list.page.html',
  styleUrls: ['./experiment-list.page.scss'],
  imports: [
    IonIcon, IonFabButton, IonFab, IonButtons, IonLabel, IonItem, IonList,
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    TranslateModule, IonMenuButton, IonButton, IonActionSheet, IonText,
    IonSegment, IonSegmentButton, IonInput,
    BackButtonComponent,
  ],
})
export class ExperimentListPage {
  private experimentService = inject(ExperimentService);
  private navigationService = inject(NavigationService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  private logService = inject(LogService);

  constructor() { addIcons({ searchOutline }); }

  experiments: IExperiment[] = [];
  activeTab: Tab = 'in-progress';
  searchQuery = '';

  getActionSheetButtons(experiment: IExperiment) {
    const buttons = [
      { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
    ];
    if (!experiment.factEndDate) {
      buttons.push({ text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } });
    }
    buttons.push({ text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } } as any);
    return buttons;
  }

  get showBackButton(): boolean {
    return this.navigationService.fromDashboard;
  }

  get hasFinishedExperiments(): boolean {
    return this.experiments.some(e => e.isSuccess !== null);
  }

  get visibleExperiments(): IExperiment[] {
    if (!this.hasFinishedExperiments) return this.experiments;
    switch (this.activeTab) {
      case 'in-progress': return this.experiments.filter(e => e.isSuccess === null && !e.factEndDate);
      case 'success': return this.experiments.filter(e => e.isSuccess === 1);
      case 'failed': return this.experiments.filter(e => e.isSuccess === 0);
    }
  }

  get filteredExperiments(): IExperiment[] {
    const q = this.searchQuery.trim().toLowerCase();
    return q ? this.visibleExperiments.filter(e => e.title.toLowerCase().includes(q)) : this.visibleExperiments;
  }

  onTabChange(event: CustomEvent) {
    this.activeTab = event.detail.value as Tab;
  }

  formatDate(dateStr: string): string {
    return formatDisplayDate(dateStr, this.translate.currentLang || 'en');
  }

  async ionViewDidEnter() {
    try {
      await this.experimentService.checkAndUpdateStatusesIfNeeded();
      this.experiments = await this.experimentService.getAll();
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentListPage.ionViewDidEnter', e);
    }
  }

  async doExperimentAction(event: CustomEvent<OverlayEventDetail>, experimentId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/experiment', experimentId]);
        break;
      case 'edit':
        await this.router.navigate(['/experiment/edit', experimentId]);
        break;
      case 'delete':
        await this.deleteExperiment(experimentId);
        break;
    }
  }

  async deleteExperiment(experimentId: number) {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role === 'yes') {
      try {
        await this.experimentService.delete({ id: experimentId });
        this.toastService.enqueue({ title: 'TK_EXPERIMENT_DELETED_SUCCESSFULLY', type: 'success' });
        this.experiments = this.experiments.filter((e) => e.id !== experimentId);
      } catch (e) {
        this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
        this.logService.error('ExperimentListPage.deleteExperiment', e);
      }
    }
  }

  async goToViewPage(experimentId: number) {
    await this.router.navigate(['/experiment', experimentId]);
  }

  async goToAddPage() {
    await this.router.navigate(['/experiment/add']);
  }
}
