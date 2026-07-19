import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonIcon, IonSelect, IonSelectOption, IonCheckbox, IonLabel } from '@ionic/angular/standalone';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { AlertController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';
import { appVersion } from '../../../environments/version';
import { BackupService } from 'src/app/services/backup.service';
import { environment } from '../../../environments/environment';
import { HookService } from 'src/app/services/hook.service';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { DatabaseRouter } from 'src/app/services/db/database-router.service';
import { databaseUpgrades } from 'src/app/services/db/database.upgrade';
import { CacheService } from 'src/app/services/cache.service';
import { ToastService } from 'src/app/services/toast.service';
import { AppConfigService } from 'src/app/services/app-config.service';
import { LogService } from 'src/app/services/log.service';
import { WelcomeModalComponent } from 'src/app/components/welcome-modal/welcome-modal.component';
import { formatDisplayDate } from 'src/app/functions/date';

export enum autoBackupOption {
  'none' = 'TK_NONE',
  'daily' = 'TK_DAILY',
  'weekly' = 'TK_WEEKLY',
  'monthly' = 'TK_MONTHLY',
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [IonIcon, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonSelect, IonSelectOption, IonCheckbox, NavButtonComponent],
})
export class SettingsPage implements OnInit {
  private translate = inject(TranslateService);
  private backupService = inject(BackupService);
  private navigationService = inject(NavigationService);
  private hookService = inject(HookService);
  private alertController = inject(AlertController);
  private databaseRouter = inject(DatabaseRouter);
  private cacheService = inject(CacheService);
  private toastService = inject(ToastService);
  private appConfigService = inject(AppConfigService);
  private logService = inject(LogService);
  private router = inject(Router);
  get showBackButton(): boolean {
    return this.navigationService.fromDashboard;
  }

  appVersion = appVersion;
  env = !environment.production ? '(dev)' : '';
  get currentDatabase() { return this.databaseRouter.getCurrentAdapterName(); }
  readonly dbVersion = databaseUpgrades[databaseUpgrades.length - 1].toVersion;
  environment = environment;
  autoBackupOption = autoBackupOption;
  autoBackupPeriod: autoBackupOption = autoBackupOption.none;
  password = '';
  lastBackupDate = '';
  formatDisplayDate = formatDisplayDate;
  resetDatabaseOnReload = false;
  unlockAllAchievements = false;
  cacheEnabled = true;
  showWelcomeMessage = true;

  async ngOnInit() {
    const autobackupPeriod = (await Preferences.get({ key: 'auto-backup-period' }))?.value;

    if (autobackupPeriod) {
      this.autoBackupPeriod = autobackupPeriod as autoBackupOption;
    }

    this.password = (await SecureStoragePlugin.get({ key: 'backup-password' }).catch(() => null))?.value ?? '';
    this.lastBackupDate = (await Preferences.get({ key: 'last-backup-date' }))?.value ?? '';
    this.resetDatabaseOnReload = (await Preferences.get({ key: 'reset-database-on-reload' }))?.value === 'true';
    this.unlockAllAchievements = (await Preferences.get({ key: 'unlock-all-achievements' }))?.value === 'true';
    this.cacheEnabled = (await Preferences.get({ key: 'cache-enabled' }))?.value !== 'false';

    try {
      const dismissed = await this.appConfigService.get(WelcomeModalComponent.DISMISSED_KEY);
      this.showWelcomeMessage = dismissed !== 'true';
    } catch (e) {
      this.logService.error('SettingsPage.ngOnInit', e);
    }
  }

  async onTxtFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const content = reader.result as string;

      await this.backupService.restore(content);
    };

    reader.readAsText(file);
    input.value = '';
  }

  async changeLanguage(lang: string) {
    await Preferences.set({ key: 'language', value: lang });
    this.translate.use(lang);
  }

  getLanguage() {
    return this.translate.getCurrentLang();
  }

  goToDatabase() {
    this.router.navigate(['/database']);
  }

  goToDocs() {
    this.router.navigate(['/docs']);
  }

  async backupDatabase() {
    await this.backupService.backup();
  }

  async visitHomePage(event: Event) {
    event.preventDefault(); 

    this.hookService.emit({
      type: 'homepage.visited',
      payload: {},
    });

    const currentLanguage = (await Preferences.get({ key: 'language' })).value;

    window.location.href = currentLanguage == 'ru' 
      ? 'https://etsbox.com/ru/tracklab'
      : 'https://etsbox.com/track-lab';
  }

  getAutobackupValue() {
    return this.autoBackupPeriod;
  }

  async setAutobackupPeriod(event: any) {
    const value = event.target?.value;

    this.autoBackupPeriod = await this.backupService.setAutobackupPeriod(value);
  }

  async changePassword(initialSet: boolean) {
    this.password = await this.backupService.askPasswordToSet(initialSet) ?? '';
  }

  getDefaultPassword() {
    return this.backupService.defaultPassword;
  }

  async setResetDatabaseOnReload(event: any) {
    const value = event.detail.checked as boolean;
    await Preferences.set({ key: 'reset-database-on-reload', value: String(value) });
  }

  async setUnlockAllAchievements(event: any) {
    const value = event.detail.checked as boolean;
    await Preferences.set({ key: 'unlock-all-achievements', value: String(value) });
  }

  async setCacheEnabled(event: any) {
    const value = event.detail.checked as boolean;
    await this.cacheService.setEnabled(value);
  }

  /** Toggle the first-launch welcome: checked re-arms it, unchecked opts out. */
  async setShowWelcomeMessage(event: any) {
    const value = event.detail.checked as boolean;
    try {
      await this.appConfigService.set(WelcomeModalComponent.DISMISSED_KEY, value ? 'false' : 'true');
    } catch (e) {
      this.toastService.emit({ title: this.translate.instant('TK_AN_ERROR_OCCURRED'), type: 'error' });
      this.logService.error('SettingsPage.setShowWelcomeMessage', e);
    }
  }

  clearCache(): void {
    this.cacheService.invalidateAll();
    this.toastService.emit({ title: this.translate.instant('TK_DONE'), type: 'success' });
  }

  async resetDatabase() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CONFIRMATION'),
      subHeader: this.translate.instant('TK_RESET_DATABASE_CONFIRMATION'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role !== 'yes') {
      return;
    }

    await this.backupService.clearDatabase();
    await Preferences.remove({ key: 'last-backup-date' });
    this.lastBackupDate = '';
  }
}
