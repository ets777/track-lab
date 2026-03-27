import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { SQLiteService } from './db/sqlite.service';

@Injectable({ providedIn: 'root' })
export class ActivityMetricService extends DatabaseService<'activityMetrics'> {
  protected tableName: 'activityMetrics' = 'activityMetrics';
  private sqlite = inject(SQLiteService);

  async getByActivityId(activityId: number) {
    return this.getAllWhereEquals('activityId', activityId);
  }

  async getByMetricIdInValueRange(metricId: number, range: [number, number]) {
    const all = await this.getAllWhereEquals('metricId', metricId);
    return all.filter((r) => r.value !== null && r.value >= range[0] && r.value <= range[1]);
  }

  async getAboveMaxByMetricId(metricId: number, max: number) {
    const all = await this.getAllWhereEquals('metricId', metricId);
    return all.filter((r) => r.value !== null && r.value > max);
  }

  async getBelowMinByMetricId(metricId: number, min: number) {
    const all = await this.getAllWhereEquals('metricId', metricId);
    return all.filter((r) => r.value !== null && r.value < min);
  }

  async getLastValue(metricId: number): Promise<number | null> {
    const result = await this.sqlite.query(
      `SELECT am.value FROM activityMetrics am
       JOIN activities a ON am.activityId = a.id
       WHERE am.metricId = ?
       ORDER BY a.date DESC, a.startTime DESC
       LIMIT 1`,
      [metricId],
    );

    return result.values?.[0]?.value ?? null;
  }
}
