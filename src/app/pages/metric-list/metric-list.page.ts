import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';
import { MetricService } from 'src/app/services/metric.service';
import { ToastService } from 'src/app/services/toast.service';
import { IMetric } from 'src/app/db/models/metric';
import { Router } from '@angular/router';
import { OverlayEventDetail } from '@ionic/core';

@Component({
  selector: 'app-metric-list',
  templateUrl: './metric-list.page.html',
  styleUrls: ['./metric-list.page.scss'],
  imports: [IonActionSheet, IonButton, IonIcon, IonFabButton, IonFab, IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule],
})
export class MetricListPage {
  private metricService = inject(MetricService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);
  private router = inject(Router);
  private translate = inject(TranslateService);

  metrics: IMetric[] = [];

  getMetricActionSheetButtons(metric: IMetric) {
    const buttons: any[] = [
      { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
      { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    ];

    if (!metric.isBase) {
      buttons.push({
        text: this.translate.instant('TK_DELETE'),
        role: 'destructive',
        data: { action: 'delete' },
      });
    }

    return buttons;
  }

  async ionViewDidEnter() {
    await this.fetchMetrics();
  }

  async fetchMetrics() {
    this.metrics = await this.metricService.getAll();
  }

  async goToAddPage() {
    await this.router.navigate(['/metric/add']);
  }

  async doMetricAction(event: CustomEvent<OverlayEventDetail>, metricId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/metric', metricId]);
        break;
      case 'edit':
        await this.router.navigate(['/metric/edit', metricId]);
        break;
      case 'delete':
        await this.deleteMetric(metricId);
        break;
      default:
        break;
    }
  }

  async deleteMetric(metricId: number) {
    const confirmed = await this.confirm();

    if (!confirmed) {
      return;
    }

    await this.metricService.delete({ id: metricId });

    this.toastService.enqueue({
      title: 'TK_METRIC_DELETED_SUCCESSFULLY',
      type: 'success',
    });

    await this.fetchMetrics();
  }

  private async confirm(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();

    return role === 'yes';
  }
}
