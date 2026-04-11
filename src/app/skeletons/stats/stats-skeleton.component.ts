import { Component } from '@angular/core';
import { IonItem, IonLabel, IonSkeletonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-stats-skeleton',
  templateUrl: './stats-skeleton.component.html',
  styleUrls: ['./stats-skeleton.component.scss'],
  imports: [IonItem, IonLabel, IonSkeletonText],
})
export class StatsSkeletonComponent {}
