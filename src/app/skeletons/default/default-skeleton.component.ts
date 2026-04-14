import { Component, Input } from '@angular/core';
import { IonItem, IonLabel, IonSkeletonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-default-skeleton',
  templateUrl: './default-skeleton.component.html',
  imports: [IonItem, IonLabel, IonSkeletonText],
})
export class DefaultSkeletonComponent {
  @Input() count = 5;
  @Input() showIcon = true;
  @Input() lines = 2;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }

  get lineItems(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }
}
