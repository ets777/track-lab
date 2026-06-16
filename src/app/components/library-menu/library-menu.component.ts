import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonMenu, MenuController } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-library-menu',
  templateUrl: './library-menu.component.html',
  styleUrls: ['./library-menu.component.scss'],
  imports: [IonContent, IonMenu, TranslateModule],
})
export class LibraryMenuComponent {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);

  async goTo(path: string) {
    await this.menuCtrl.close('library-menu');
    await this.router.navigate([path]);
  }
}
