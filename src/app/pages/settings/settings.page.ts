import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';
import { appVersion } from '../../../environments/version';
import { BackupService } from 'src/app/services/backup.service';
import { environment } from '../../../environments/environment';
import { HookService } from 'src/app/services/hook.service';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { ToastService } from 'src/app/services/toast.service';

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
  imports: [IonIcon, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonSelect, IonSelectOption],
})
export class SettingsPage implements OnInit {
  private markdownParserService = inject(MarkdownParserService);
  private translate = inject(TranslateService);
  private backupService = inject(BackupService);
  private hookService = inject(HookService);
  private toastService = inject(ToastService);

  appVersion = appVersion;
  env = !environment.production ? '(dev)' : '';
  autoBackupOption = autoBackupOption;
  autoBackupPeriod: autoBackupOption = autoBackupOption.none;
  password = '';
  lastBackupDate = '';

  async ngOnInit() {
    const autobackupPeriod = (await Preferences.get({ key: 'auto-backup-period' }))?.value;

    if (autobackupPeriod) {
      this.autoBackupPeriod = autobackupPeriod as autoBackupOption;
    }

    this.password = (await SecureStoragePlugin.get({ key: 'backup-password' }).catch(() => null))?.value ?? '';
    this.lastBackupDate = (await Preferences.get({ key: 'last-backup-date' }))?.value ?? '';
  }

  async onMdFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const content = reader.result as string;

      try {
        await this.markdownParserService.parseMarkdownFile(file.name, content);
      } catch (e: any) {
        this.toastService.enqueue({
          title: this.translate.instant(e.message),
          type: 'error',
        });
      }
    };

    reader.readAsText(file);
    input.value = '';
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
}
