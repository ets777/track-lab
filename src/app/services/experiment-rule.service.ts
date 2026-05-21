import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { IExperimentRuleDb } from '../db/models/experiment-rule';

@Injectable({ providedIn: 'root' })
export class ExperimentRuleService extends DatabaseService<'experimentRules'> {
  protected tableName: 'experimentRules' = 'experimentRules';

  async getByExperimentId(experimentId: number): Promise<IExperimentRuleDb[]> {
    return this.getAllWhereEquals('experimentId', experimentId) as Promise<IExperimentRuleDb[]>;
  }

  async deleteByExperimentId(experimentId: number): Promise<void> {
    return this.delete({ experimentId });
  }
}
