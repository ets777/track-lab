import { Injectable, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private navController = inject(NavController);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  private history: string[] = [];
  private lastBackPress = 0;
  private _fromDashboard = false;
  private _fromDashboardPendingClear = false;

  get previousUrl(): string | undefined {
    return this.history.length > 1 ? this.history[this.history.length - 2] : undefined;
  }

  get fromDashboard(): boolean {
    return this._fromDashboard;
  }

  setFromDashboard() {
    this._fromDashboard = true;
    this._fromDashboardPendingClear = false;
  }

  pushUrl(url: string) {
    if (this._fromDashboardPendingClear) {
      this._fromDashboard = false;
      this._fromDashboardPendingClear = false;
    } else if (this._fromDashboard) {
      this._fromDashboardPendingClear = true;
    }

    if (!this.history.length || this.history[this.history.length - 1] !== url) {
      this.history.push(url);
      this.history = this.history.slice(
        Math.max(this.history.length - 5, 0),
        this.history.length,
      );
    }
  }

  async goBack() {
    if (this.history.length > 1) {
      this.history.pop();
      const previous = this.history[this.history.length - 1];
      this.navController.navigateBack(previous);
    } else {
      const now = Date.now();
      if (now - this.lastBackPress < 2000) {
        await CapacitorApp.exitApp();
      } else {
        this.lastBackPress = now;

        this.toastService.enqueue({
          title: this.translate.instant('TK_PRESS_BACK_AGAIN_TO_EXIT'),
          duration: 1500,
        });
      }
    }
  }
}
