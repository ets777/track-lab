import { Component, Input, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { IonButton, IonIcon, IonMenuButton } from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import { NavigationService } from 'src/app/services/navigation.service';

/**
 * Unified toolbar leading button. Renders the back arrow (driven by the tracked
 * NavigationService history) when `showBack` is true, otherwise the menu burger.
 * Single source of position/margins for both — see [[navigation-system]].
 */
@Component({
  selector: 'app-nav-button',
  templateUrl: './nav-button.component.html',
  styleUrls: ['./nav-button.component.scss'],
  imports: [IonButton, IonIcon, IonMenuButton],
})
export class NavButtonComponent {
  private navigationService = inject(NavigationService);
  private navController = inject(NavController);

  @Input() showBack = true;
  @Input() menu?: string;
  /** Where to go when there is no tracked history (e.g. deep link). */
  @Input() defaultHref = '/dashboard';

  constructor() {
    addIcons({ arrowBack });
  }

  back() {
    if (this.navigationService.previousUrl) {
      this.navigationService.goBack();
    } else {
      this.navController.navigateBack(this.defaultHref);
    }
  }
}
