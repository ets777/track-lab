import { Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private history: string[] = [];
    private lastBackPress = 0;

    constructor(
        private navController: NavController,
        private toastService: ToastService,
        private translate: TranslateService,
    ) { }

    pushUrl(url: string) {
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
