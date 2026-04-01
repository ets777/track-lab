import { Injectable } from '@angular/core';
import { DatabaseService } from './db/database.service';
import { StreakForm } from '../components/streak-form/streak-form.component';
import { IStreakCreateDto } from '../db/models/streak';
import { IStreak } from '../db/models/streak';

@Injectable({ providedIn: 'root' })
export class StreakService extends DatabaseService<'streaks'> {
  protected tableName: 'streaks' = 'streaks';

  async addFromForm(formData: StreakForm) {
    const streakCreateDto: IStreakCreateDto = {
      startDate: formData.startDate,
    };

    switch(formData.term.type) {
      case 'action':
        streakCreateDto.actionId = formData.term.termId;
        break;
      case 'tag':
        streakCreateDto.tagId = formData.term.termId;
        break;
      default:
        streakCreateDto.termId = formData.term.termId;
        break;
    }

    return this.add(streakCreateDto);
  }

  async updateFromForm(id: number, formData: StreakForm) {
    const changes = {
      startDate: formData.startDate,
      actionId: null as number | null,
      tagId: null as number | null,
      termId: null as number | null,
    };

    switch (formData.term.type) {
      case 'action':
        changes.actionId = formData.term.termId;
        break;
      case 'tag':
        changes.tagId = formData.term.termId;
        break;
      default:
        changes.termId = formData.term.termId;
        break;
    }

    return this.update(id, changes as any);
  }
}
