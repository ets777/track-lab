import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { TermService } from 'src/app/services/term.service';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { ITerm } from 'src/app/db/models/term';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-streak-view',
  templateUrl: './streak-view.page.html',
  styleUrls: ['./streak-view.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, TranslateModule, BackButtonComponent],
})
export class StreakViewPage {
  private route = inject(ActivatedRoute);
  private streakService = inject(StreakService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private termService = inject(TermService);

  streakId: number;
  streak?: IStreak;
  actions: IActionDb[] = [];
  tags: ITag[] = [];
  terms: ITerm[] = [];

  constructor() {
    this.streakId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    const [streak, actions, tags, terms] = await Promise.all([
      this.streakService.getById(this.streakId),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.termService.getAll(),
    ]);

    this.streak = streak;
    this.actions = actions;
    this.tags = tags;
    this.terms = terms;
  }

  getTermName() {
    if (!this.streak) return '';

    if (this.streak.actionId) {
      return this.actions.find(a => a.id === this.streak!.actionId)?.name ?? '';
    }
    if (this.streak.tagId) {
      return this.tags.find(t => t.id === this.streak!.tagId)?.name ?? '';
    }
    if (this.streak.termId) {
      return this.terms.find(t => t.id === this.streak!.termId)?.name ?? '';
    }

    return '';
  }
}
