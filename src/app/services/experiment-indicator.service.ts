import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { IExperimentIndicatorDb } from '../db/models/experiment-indicator';

@Injectable({ providedIn: 'root' })
export class ExperimentIndicatorService extends DatabaseService<'experimentIndicators'> {
  protected tableName: 'experimentIndicators' = 'experimentIndicators';

  async getByExperimentId(experimentId: number): Promise<IExperimentIndicatorDb[]> {
    return this.getAllWhereEquals('experimentId', experimentId) as Promise<IExperimentIndicatorDb[]>;
  }

  async deleteByExperimentId(experimentId: number): Promise<void> {
    return this.delete({ experimentId });
  }
}
