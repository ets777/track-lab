import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { ActivityTermService } from './activity-term.service';

@Injectable({ providedIn: 'root' })
export class TermService extends DatabaseService<'terms'> {
  private activityTermService = inject(ActivityTermService);

  protected tableName: 'terms' = 'terms';

  async getByActivityId(activityId: number) {
    const activityTerms = await this.activityTermService.getByActivityId(
      activityId,
    );

    const termIds = activityTerms.map((activityTerm) => activityTerm.termId);
    const terms = await this.getAnyOf('id', termIds);

    return terms;
  }

  async getAllUnhidden() {
    const allTerms = await this.getAll();
    return allTerms.filter((term) => !term.isHidden);
  }
}
