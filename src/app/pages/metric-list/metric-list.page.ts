import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MetricService } from 'src/app/services/metric.service';
import { IMetric } from 'src/app/db/models/metric';
import { Router } from '@angular/router';

@Component({
  selector: 'app-metric-list',
  templateUrl: './metric-list.page.html',
  styleUrls: ['./metric-list.page.scss'],
  imports: [IonIcon, IonFabButton, IonFab, IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule],
})
export class MetricListPage {
  private metricService = inject(MetricService);
  private router = inject(Router);

  metrics: IMetric[] = [];

  async ionViewDidEnter() {
    await this.fetchMetrics();
  }

  async fetchMetrics() {
    this.metrics = await this.metricService.getAll();
  }

  async goToAddPage() {
    await this.router.navigate(['/metric/add']);
  }
}
