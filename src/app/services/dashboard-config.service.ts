import { Injectable } from '@angular/core';
import { DashboardWidget, WidgetConfig, DEFAULT_DASHBOARD_WIDGETS } from 'src/app/types/dashboard-widget';

const STORAGE_KEY = 'dashboard_widgets';

@Injectable({ providedIn: 'root' })
export class DashboardConfigService {
  getWidgets(): DashboardWidget[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DashboardWidget[];
      } catch {
        return [...DEFAULT_DASHBOARD_WIDGETS];
      }
    }
    return [...DEFAULT_DASHBOARD_WIDGETS];
  }

  save(widgets: DashboardWidget[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }

  addWidget(config: WidgetConfig): void {
    const widgets = this.getWidgets();
    widgets.push({ id: crypto.randomUUID(), config });
    this.save(widgets);
  }

  updateWidget(id: string, config: WidgetConfig): void {
    const widgets = this.getWidgets();
    const idx = widgets.findIndex(w => w.id === id);
    if (idx !== -1) {
      widgets[idx] = { ...widgets[idx], config };
      this.save(widgets);
    }
  }

  deleteWidget(id: string): void {
    this.save(this.getWidgets().filter(w => w.id !== id));
  }

  moveUp(id: string): void {
    const widgets = this.getWidgets();
    const idx = widgets.findIndex(w => w.id === id);
    if (idx > 0) {
      [widgets[idx - 1], widgets[idx]] = [widgets[idx], widgets[idx - 1]];
      this.save(widgets);
    }
  }

  moveDown(id: string): void {
    const widgets = this.getWidgets();
    const idx = widgets.findIndex(w => w.id === id);
    if (idx < widgets.length - 1) {
      [widgets[idx], widgets[idx + 1]] = [widgets[idx + 1], widgets[idx]];
      this.save(widgets);
    }
  }
}
