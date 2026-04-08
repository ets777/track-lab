import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { IActivity } from 'src/app/db/models/activity';
import { IMetric } from 'src/app/db/models/metric';
import { ActivityService } from 'src/app/services/activity.service';
import { MetricService } from 'src/app/services/metric.service';
import { TranslateModule } from '@ngx-translate/core';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TagsComponent } from 'src/app/components/tags/tags.component';
import { entitiesToString } from 'src/app/functions/string';

@Component({
  selector: 'app-activity-view',
  templateUrl: './activity-view.page.html',
  styleUrls: ['./activity-view.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, TranslateModule, BackButtonComponent, TagsComponent],
})
export class ActivityViewPage {
  private route = inject(ActivatedRoute);
  private activityService = inject(ActivityService);
  private metricService = inject(MetricService);

  activityId: number;
  activity?: IActivity;
  metrics: IMetric[] = [];

  entitiesToString = entitiesToString;

  constructor() {
    this.activityId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    [this.activity, this.metrics] = await Promise.all([
      this.activityService.getEnriched(this.activityId),
      this.metricService.getAll(),
    ]);
  }

  getAllTags() {
    if (!this.activity) return [];
    const seen = new Set<number>();
    const all = [];
    for (const tag of [...this.activity.tags, ...this.activity.actions.flatMap(a => a.tags)]) {
      if (!seen.has(tag.id)) {
        seen.add(tag.id);
        all.push(tag);
      }
    }
    return all;
  }

  getMetricName(metricId: number) {
    return this.metrics.find(m => m.id === metricId)?.name ?? String(metricId);
  }

  getMetricUnit(metricId: number) {
    return this.metrics.find(m => m.id === metricId)?.unit ?? '';
  }
}
