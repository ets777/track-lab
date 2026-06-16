import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonMenu, MenuController } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-lab-menu',
  templateUrl: './lab-menu.component.html',
  styleUrls: ['./lab-menu.component.scss'],
  imports: [IonContent, IonMenu, TranslateModule],
})
export class LabMenuComponent {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);

  async goTo(path: string) {
    await this.menuCtrl.close('lab-menu');
    await this.router.navigate([path]);
  }
}
