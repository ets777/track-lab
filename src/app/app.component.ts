import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { TabsComponent } from './components/tabs/tabs.component';
import { TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { AchievementService } from './services/achievement.service';
import { Platform, NavController } from '@ionic/angular';
import { AchievementToastComponent } from "./components/achievement-toast/achievement-toast.component";
import { TooltipComponent } from "./components/tooltip/tooltip.component";
import { StatsMenuComponent } from "./components/stats-menu/stats-menu.component";
import { autoBackupOption } from './pages/settings/settings.page';
import { differenceInDays, differenceInMonths } from 'date-fns';
import { ToastComponent } from './components/toast/toast.component';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, TabsComponent, AchievementToastComponent, TooltipComponent, StatsMenuComponent, ToastComponent],
})
export class AppComponent implements OnInit {
  constructor(
    private translate: TranslateService,
    private achievementService: AchievementService,
    private platform: Platform,
    private navController: NavController,
    private databaseService: DatabaseService,
  ) {
    this.setAdaptiveStatusBarColor();
  }

  async ngOnInit() {
    this.setLanguages();
    await this.achievementService.init();
    this.initializeApp();
    await this.autoBackup();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(5, () => {
        this.navController.back();
      });
    });
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
      || browserLanguage
      || systemLanguage
      || defaultLanguage
    );
  }

  async autoBackup() {
    const autobackupPeriod = (await Preferences.get({ key: 'auto-backup-period' }))?.value;
    
    if (autobackupPeriod == autoBackupOption.none) {
      return;
    }
    
    const lastBackupDate = (await Preferences.get({ key: 'last-backup-date' }))?.value;
    let needBackup = false;
    
    if (lastBackupDate) {
      const currentDate = new Date();
      const daysDiff = differenceInDays(currentDate, new Date(lastBackupDate));
      const monthsDiff = differenceInMonths(currentDate, new Date(lastBackupDate));

      console.log(autobackupPeriod);
      console.log(lastBackupDate);
      console.log(daysDiff, monthsDiff);

      needBackup = autobackupPeriod == autoBackupOption.daily && daysDiff > 0
        || autobackupPeriod == autoBackupOption.weekly && daysDiff > 6
        || autobackupPeriod == autoBackupOption.monthly && monthsDiff > 0
    } else {
      needBackup = true
    }

    if (needBackup) {
      this.databaseService.backup();
    }
  }
}
