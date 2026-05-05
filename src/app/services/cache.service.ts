import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, unknown>();
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

  has(key: string): boolean {
    return this._isEnabled && this.cache.has(key);
  }

  get<T>(key: string): T {
    return this.cache.get(key) as T;
  }

  set<T>(key: string, data: T): void {
    if (!this._isEnabled) return;
    this.cache.set(key, data);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this._isEnabled = enabled;
    this.invalidateAll();
    await Preferences.set({ key: 'cache-enabled', value: String(enabled) });
  }
}
