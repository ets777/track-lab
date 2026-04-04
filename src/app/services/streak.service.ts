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
        streakCreateDto.actionId = formData.term.itemId;
        break;
      case 'tag':
        streakCreateDto.tagId = formData.term.itemId;
        break;
      default:
        streakCreateDto.itemId = formData.term.itemId;
        break;
    }

    return this.add(streakCreateDto);
  }

  async updateFromForm(id: number, formData: StreakForm) {
    const changes = {
      startDate: formData.startDate,
      actionId: null as number | null,
      tagId: null as number | null,
      itemId: null as number | null,
    };

    switch (formData.term.type) {
      case 'action':
        changes.actionId = formData.term.itemId;
        break;
      case 'tag':
        changes.tagId = formData.term.itemId;
        break;
      default:
        changes.itemId = formData.term.itemId;
        break;
    }

    return this.update(id, changes as any);
  }
}
