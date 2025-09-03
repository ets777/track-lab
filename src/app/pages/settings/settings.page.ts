import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem } from '@ionic/angular/standalone';
import { MarkdownParserService } from 'src/app/services/markdown-parser.service';
import { IActivityDTO } from 'src/app/db';
import { ActivityService } from 'src/app/services/activity.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class SettingsPage implements OnInit {

  constructor(
    private markdownParserService: MarkdownParserService,
    private activityService: ActivityService,
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
}
