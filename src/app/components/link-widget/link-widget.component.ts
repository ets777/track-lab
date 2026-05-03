import { Component, Input, HostBinding, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationService } from 'src/app/services/navigation.service';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  addCircleOutline, timeOutline, shieldCheckmarkOutline,
  barChartOutline, libraryOutline, settingsOutline, trophyOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-link-widget',
  templateUrl: './link-widget.component.html',
  styleUrl: './link-widget.component.scss',
  imports: [IonCard, IonCardContent, IonIcon, TranslateModule],
})
export class LinkWidgetComponent {
  @Input() icon = '';
  @Input() label = '';
  @Input() route = '';
  @Input() color = '';
  @Input() wide = false;
  @Input() compact = false;

  @HostBinding('class.wide') get isWide() { return this.wide; }
  @HostBinding('class.compact') get isCompact() { return this.compact; }

  private router = inject(Router);
  private navigationService = inject(NavigationService);

  constructor() {
    addIcons({ addCircleOutline, timeOutline, shieldCheckmarkOutline, barChartOutline, libraryOutline, settingsOutline, trophyOutline });
  }

  navigate() {
    this.navigationService.setFromDashboard();
    this.router.navigate([this.route]);
  }
}
