import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    this.setAdaptiveStatusBarColor();
  }

  setAdaptiveStatusBarColor() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (mediaQuery.matches) {
        StatusBar.setBackgroundColor({ color: '#000000' });
      } else {
        StatusBar.setBackgroundColor({ color: '#ffffff' });
      }
    };

    applyTheme();

    mediaQuery.addEventListener('change', applyTheme);
  }
}
