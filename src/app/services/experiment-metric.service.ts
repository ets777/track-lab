import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { IExperimentMetricDb } from '../db/models/experiment-metric';

@Injectable({ providedIn: 'root' })
export class ExperimentMetricService extends DatabaseService<'experimentMetrics'> {
  protected tableName: 'experimentMetrics' = 'experimentMetrics';

  async getByExperimentId(experimentId: number): Promise<IExperimentMetricDb[]> {
    return this.getAllWhereEquals('experimentId', experimentId) as Promise<IExperimentMetricDb[]>;
  }

  async deleteByExperimentId(experimentId: number): Promise<void> {
    return this.delete({ experimentId });
  }
}
