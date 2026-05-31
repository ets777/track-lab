import { Injectable, inject } from '@angular/core';
import { DashboardWidget, WidgetConfig, DEFAULT_DASHBOARD_WIDGETS } from 'src/app/types/dashboard-widget';
import { generateUUID } from 'src/app/functions/crypto';
import { AppConfigService } from './app-config.service';

const KEY = 'dashboard_widgets';

@Injectable({ providedIn: 'root' })
export class DashboardConfigService {
  private appConfig = inject(AppConfigService);

  async getWidgets(): Promise<DashboardWidget[]> {
    const raw = await this.appConfig.get(KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DashboardWidget[];
      } catch {
        return [...DEFAULT_DASHBOARD_WIDGETS];
      }
    }
    return [...DEFAULT_DASHBOARD_WIDGETS];
  }

  async save(widgets: DashboardWidget[]): Promise<void> {
    await this.appConfig.set(KEY, JSON.stringify(widgets));
  }

  async addWidget(config: WidgetConfig): Promise<void> {
    const widgets = await this.getWidgets();
    widgets.push({ id: generateUUID(), config });
    await this.save(widgets);
  }

  async updateWidget(id: string, config: WidgetConfig): Promise<void> {
    const widgets = await this.getWidgets();
    const idx = widgets.findIndex(w => w.id === id);
    if (idx !== -1) {
      widgets[idx] = { ...widgets[idx], config };
      await this.save(widgets);
    }
  }

  async deleteWidget(id: string): Promise<void> {
    const widgets = await this.getWidgets();
    await this.save(widgets.filter(w => w.id !== id));
  }

  async moveUp(id: string): Promise<void> {
    const widgets = await this.getWidgets();
    const idx = widgets.findIndex(w => w.id === id);
    if (idx > 0) {
      [widgets[idx - 1], widgets[idx]] = [widgets[idx], widgets[idx - 1]];
      await this.save(widgets);
    }
  }

  async moveDown(id: string): Promise<void> {
    const widgets = await this.getWidgets();
    const idx = widgets.findIndex(w => w.id === id);
    if (idx < widgets.length - 1) {
      [widgets[idx], widgets[idx + 1]] = [widgets[idx + 1], widgets[idx]];
      await this.save(widgets);
    }
  }
}
