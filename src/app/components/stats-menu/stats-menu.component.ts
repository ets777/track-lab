import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonMenu, MenuController } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-stats-menu',
  templateUrl: './stats-menu.component.html',
  styleUrls: ['./stats-menu.component.scss'],
  imports: [IonContent, IonMenu, TranslateModule],
})
export class StatsMenuComponent {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);

  async goTo(path: string) {
    await this.menuCtrl.close('stats-menu');
    await this.router.navigate([path]);
  }
}
