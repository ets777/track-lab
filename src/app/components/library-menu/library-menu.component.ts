import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonContent, IonMenu, IonToolbar, IonTitle, IonList, IonItem, MenuController } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-library-menu',
  templateUrl: './library-menu.component.html',
  styleUrls: ['./library-menu.component.scss'],
  imports: [IonItem, IonList, IonHeader, IonContent, IonTitle, IonToolbar, IonMenu, TranslateModule],
})
export class LibraryMenuComponent {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);

  async goTo(path: string) {
    await this.menuCtrl.close('library-menu');
    await this.router.navigate([path]);
  }
}
