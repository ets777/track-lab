import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonSelect, IonSelectOption, IonItem } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseRouter } from 'src/app/services/db/database-router.service';
import { TableName } from 'src/app/services/db/types';
import { BackupService } from 'src/app/services/backup.service';

const ALL_TABLES: TableName[] = [
  'activities', 'actions', 'activityActions', 'activityTags', 'activityItems', 'activityMetrics',
  'tags', 'actionTags', 'actionLists', 'actionMetrics',
  'items', 'lists', 'metrics', 'streaks', 'tagMetrics', 'itemMetrics',
  'achievements', 'rules', 'ruleCompletions',
];

@Component({
  selector: 'app-database',
  templateUrl: './database.page.html',
  styleUrls: ['./database.page.scss'],
  standalone: true,
  imports: [IonItem, IonSelect, IonSelectOption, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule],
})
export class DatabasePage {
  private databaseRouter = inject(DatabaseRouter);
  private backupService = inject(BackupService);

  readonly tables = ALL_TABLES;
  selectedTable: TableName = 'activities';
  columns: string[] = [];
  rows: any[] = [];

  async onTableChange() {
    const all = await this.databaseRouter.getAll(this.selectedTable);
    const sorted = [...all].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 100);
    this.columns = sorted.length ? Object.keys(sorted[0]) : [];
    this.rows = sorted;
  }

  async clearDatabase() {
    await this.backupService.clearDatabase();
    await this.onTableChange();
  }
}
