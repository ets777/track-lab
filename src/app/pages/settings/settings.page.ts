import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonIcon, IonSelect, IonSelectOption, IonCheckbox, IonLabel, IonButtons } from '@ionic/angular/standalone';
import { NavigationService } from 'src/app/services/navigation.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
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
  imports: [IonIcon, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, CommonModule, FormsModule, TranslateModule, IonSelect, IonSelectOption, IonCheckbox, BackButtonComponent],
})
export class SettingsPage implements OnInit {
  private translate = inject(TranslateService);
  private backupService = inject(BackupService);
  private navigationService = inject(NavigationService);
  private hookService = inject(HookService);
  private alertController = inject(AlertController);
  private databaseRouter = inject(DatabaseRouter);
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
  resetDatabaseOnReload = false;
  unlockAllAchievements = false;

  async ngOnInit() {
    const autobackupPeriod = (await Preferences.get({ key: 'auto-backup-period' }))?.value;

    if (autobackupPeriod) {
      this.autoBackupPeriod = autobackupPeriod as autoBackupOption;
    }

    this.password = (await SecureStoragePlugin.get({ key: 'backup-password' }).catch(() => null))?.value ?? '';
    this.lastBackupDate = (await Preferences.get({ key: 'last-backup-date' }))?.value ?? '';
    this.resetDatabaseOnReload = (await Preferences.get({ key: 'reset-database-on-reload' }))?.value === 'true';
    this.unlockAllAchievements = (await Preferences.get({ key: 'unlock-all-achievements' }))?.value === 'true';
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
