import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonContent, IonMenu, IonToolbar, IonTitle, IonList, IonItem, IonAccordion, IonAccordionGroup, MenuController } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-lab-menu',
  templateUrl: './lab-menu.component.html',
  styleUrls: ['./lab-menu.component.scss'],
  imports: [IonItem, IonList, IonHeader, IonContent, IonTitle, IonToolbar, IonMenu, IonAccordion, IonAccordionGroup, TranslateModule],
})
export class LabMenuComponent {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);

  async goTo(path: string) {
    await this.menuCtrl.close('lab-menu');
    await this.router.navigate([path]);
  }
}
