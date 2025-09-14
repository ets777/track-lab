import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { TabsComponent } from './components/tabs/tabs.component';
import { TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { AchievementService } from './services/achievement.service';
import { HookService } from './services/hook.service';
import { AchievementToastComponent } from "./components/achievement-toast/achievement-toast.component";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, TabsComponent, AchievementToastComponent],
})
export class AppComponent implements OnInit {
  constructor(
    private translate: TranslateService,
    private achievementService: AchievementService,
  ) {
    this.setAdaptiveStatusBarColor();
  }
  
  async ngOnInit() {
    this.setLanguages();
    await this.achievementService.init();
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

  async setLanguages() {
    const languages = ['en', 'ru'];
    const defaultLanguage = languages[0];
    this.translate.addLangs(languages);
    this.translate.setFallbackLang(defaultLanguage);

    let systemLanguage = (await Device.getLanguageCode())?.value;

    if (!languages.includes(systemLanguage)) {
      systemLanguage = '';
    }

    let browserLanguage = this.translate.getBrowserLang() ?? '';

    if (!browserLanguage.includes(systemLanguage)) {
      browserLanguage = '';
    }

    const savedLanguage = (await Preferences.get({ key: 'language' }))?.value;

    this.translate.use(
      savedLanguage 
      || systemLanguage 
      || browserLanguage 
      || defaultLanguage
    );
  }
}
