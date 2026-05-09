import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

interface CacheEntry {
  version: number;
  data: unknown;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private tableVersions = new Map<string, number>();
  private _isEnabled = true;

  constructor() {
    Preferences.get({ key: 'cache-enabled' }).then(result => {
      if (result?.value === 'false') {
        this._isEnabled = false;
      }
    });
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  private tableVersion(tableName: string): number {
    return this.tableVersions.get(tableName) ?? 0;
  }

  has(key: string): boolean {
    if (!this._isEnabled) return false;
    const entry = this.cache.get(key);
    if (!entry) return false;
    const tableName = key.split('|')[0];
    return entry.version === this.tableVersion(tableName);
  }

  get<T>(key: string): T {
    return (this.cache.get(key) as CacheEntry).data as T;
  }

  set<T>(key: string, data: T): void {
    if (!this._isEnabled) return;
    const tableName = key.split('|')[0];
    this.cache.set(key, { version: this.tableVersion(tableName), data });
  }

  invalidate(tableName: string): void {
    this.tableVersions.set(tableName, (this.tableVersion(tableName)) + 1);
  }

  invalidateAll(): void {
    this.cache.clear();
    this.tableVersions.clear();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this._isEnabled = enabled;
    this.invalidateAll();
    await Preferences.set({ key: 'cache-enabled', value: String(enabled) });
  }
}
