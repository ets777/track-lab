import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet, IonText, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IExperiment } from 'src/app/db/models/experiment';
import { ExperimentService } from 'src/app/services/experiment.service';
import { Router } from '@angular/router';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { HelpButtonComponent } from 'src/app/components/help-button/help-button.component';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { OverlayEventDetail } from '@ionic/core';
import { LogService } from 'src/app/services/log.service';
import { formatDisplayDate } from 'src/app/functions/date';

type Filter = 'all' | 'progress' | 'success' | 'failed';

@Component({
  selector: 'app-experiment-list',
  templateUrl: './experiment-list.page.html',
  styleUrls: ['./experiment-list.page.scss'],
  imports: [
    IonIcon, IonFabButton, IonFab, IonButtons, IonLabel, IonItem, IonList,
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    TranslateModule, IonButton, IonActionSheet, IonText, IonInput,
    NavButtonComponent, HelpButtonComponent,
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
  activeFilter: Filter = 'all';
  searchQuery = '';

  readonly filters: { id: Filter; labelKey: string }[] = [
    { id: 'all', labelKey: 'TK_ALL' },
    { id: 'progress', labelKey: 'TK_IN_PROGRESS' },
    { id: 'success', labelKey: 'TK_SUCCESS' },
    { id: 'failed', labelKey: 'TK_FAILED' },
  ];

  getStatus(e: IExperiment): 'progress' | 'success' | 'failed' {
    if (e.isSuccess === 1) return 'success';
    if (e.isSuccess === 0) return 'failed';
    return 'progress';
  }

  getFilterCount(filter: Filter): number {
    if (filter === 'all') return this.experiments.length;
    return this.experiments.filter(e => this.getStatus(e) === filter).length;
  }

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

  get filteredExperiments(): IExperiment[] {
    let base = this.activeFilter === 'all'
      ? this.experiments
      : this.experiments.filter(e => this.getStatus(e) === this.activeFilter);
    const q = this.searchQuery.trim().toLowerCase();
    return q ? base.filter(e => e.title.toLowerCase().includes(q)) : base;
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
