import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonIcon } from '@ionic/angular/standalone';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';
import { appVersion } from '../../../environments/version';
import { DatabaseBackupService } from 'src/app/services/database-backup.service';
import { environment } from '../../../environments/environment';
import { HookService } from 'src/app/services/hook.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonIcon, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule]
})
export class SettingsPage implements OnInit {
  appVersion = appVersion;
  env = !environment.production ? '(dev)' : '';

  constructor(
    private markdownParserService: MarkdownParserService,
    private translate: TranslateService,
    private databaseBackupService: DatabaseBackupService,
    private hookService: HookService,
  ) { }

  ngOnInit() {
  }

  async onMdFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const content = reader.result as string;

      await this.markdownParserService.parseMarkdownFile(file.name, content);
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

      await this.databaseBackupService.restore(content);
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

  backupDatabase() {
    this.databaseBackupService.backup();
  }

  visitHomePage(event: Event) {
    event.preventDefault(); 

    this.hookService.emit({
      type: 'homepage.visited',
      payload: {},
    });

    window.location.href = 'https://etsbox.com/track-lab';
  }
}
