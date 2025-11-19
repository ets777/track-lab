import { Injectable, inject } from '@angular/core';

import { SQLiteService } from './db/sqlite.service';
import { SQLiteInitService } from './db/sqlite-init.service';

@Injectable()
export class InitializeAppService {
  private sqliteService = inject(SQLiteService);
  private sqliteInitService = inject(SQLiteInitService);

  isAppInit: boolean = false;
  platform!: string;

  async initializeApp() {
    const isPluginInitialized = await this.sqliteService.initializePlugin();

    if (!isPluginInitialized) {
      return;
    }

    this.platform = this.sqliteService.platform;
    try {
      if (this.sqliteService.platform === 'web') {
        await this.sqliteService.initWebStore();
      }

      await this.sqliteInitService.initializeDatabase();

      if (this.sqliteService.platform === 'web') {
        await this.sqliteService.saveToStore();
      }

      this.isAppInit = true;
    } catch (error) {
      console.log(`initializeAppError: ${error}`);
    }
  }

}
