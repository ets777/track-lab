import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MetricService } from 'src/app/services/metric.service';
import { IMetric } from 'src/app/db/models/metric';

@Component({
  selector: 'app-metric-list',
  templateUrl: './metric-list.page.html',
  styleUrls: ['./metric-list.page.scss'],
  standalone: true,
  imports: [IonLabel, IonItem, IonList, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule],
})
export class MetricListPage {
  private metricService = inject(MetricService);

  metrics: IMetric[] = [];

  async ionViewDidEnter() {
    await this.fetchMetrics();
  }

  async fetchMetrics() {
    this.metrics = await this.metricService.getAll();
  }
}
