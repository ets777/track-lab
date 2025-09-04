import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonIcon } from '@ionic/angular/standalone';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonIcon, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule]
})
export class SettingsPage implements OnInit {

  constructor(
    private markdownParserService: MarkdownParserService,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const content = reader.result as string;

      await this.markdownParserService.parseMarkdownFile(file.name, content);
    };

    reader.readAsText(file);
  }

  async changeLanguage(lang: string) {
    await Preferences.set({ key: 'language', value: lang });
    this.translate.use(lang);
  }

  getLanguage() {
    return this.translate.getCurrentLang();
  }
}
