import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { addOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-main-action-widget',
  templateUrl: './main-action-widget.component.html',
  styleUrl: './main-action-widget.component.scss',
  imports: [IonIcon, TranslateModule],
})
export class MainActionWidgetComponent {
  @Input() label = '';
  @Input() sublabel = '';
  @Input() icon = 'add-outline';
  @Input() route = '';
  @Input() color?: string;

  private router = inject(Router);

  constructor() {
    addIcons({ addOutline, chevronForwardOutline });
  }

  navigate() {
    this.router.navigate([this.route]);
  }
}
