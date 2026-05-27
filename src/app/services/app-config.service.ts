import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';

@Injectable({ providedIn: 'root' })
export class AppConfigService extends DatabaseService<'appConfig'> {
  protected override tableName = 'appConfig' as const;

  async get(key: string): Promise<string | null> {
    const row = await this.getFirstWhereEquals('key', key);
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.getFirstWhereEquals('key', key);
    if (existing) {
      await this.update(existing.id, { value });
    } else {
      await this.add({ key, value });
    }
  }
}
