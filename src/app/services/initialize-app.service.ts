import { Injectable, inject } from '@angular/core';

import { SQLiteService } from './db/sqlite.service';
import { SQLiteInitService } from './db/sqlite-init.service';
import { LogService } from './log.service';

@Injectable()
export class InitializeAppService {
  private sqliteService = inject(SQLiteService);
  private sqliteInitService = inject(SQLiteInitService);
  private logService = inject(LogService);

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
      await this.logService.error('InitializeAppService.initializeApp', error);
    }
  }

}
