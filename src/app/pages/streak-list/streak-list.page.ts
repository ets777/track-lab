import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonMenuButton, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';
import { Router } from '@angular/router';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { TermService } from 'src/app/services/term.service';
import { IActionDb } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { ITerm } from 'src/app/db/models/term';

@Component({
  selector: 'app-streak-list',
  templateUrl: './streak-list.page.html',
  styleUrls: ['./streak-list.page.scss'],
  imports: [IonIcon, IonFabButton, IonFab, IonButtons, IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton],
})
export class StreakListPage {
  private streakService = inject(StreakService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private termService = inject(TermService);
  private router = inject(Router);

  streaks: IStreak[] = [];
  actions: IActionDb[] = [];
  tags: ITag[] = [];
  terms: ITerm[] = [];

  async ionViewDidEnter() {
    await this.fetchStreaks();
    await this.fetchActions();
    await this.fetchTags();
    await this.fetchTerms();
  }

  async fetchStreaks() {
    this.streaks = await this.streakService.getAll();
  }

  async fetchActions() {
    this.actions = await this.actionService.getAll();
  }

  async fetchTags() {
    this.tags = await this.tagService.getAll();
  }

  async fetchTerms() {
    this.terms = await this.termService.getAll();
  }

  getTermName(streak: IStreak) {
    if (streak.actionId) {
      const action = this.actions.find((action) => action.id == streak.actionId)
      return action?.name;
    }

    if (streak.tagId) {
      const tag = this.tags.find((tag) => tag.id == streak.tagId)
      return tag?.name;
    }

    if (streak.termId) {
      const term = this.terms.find((term) => term.id == streak.termId)
      return term?.name;
    }

    return '';
  }

  async goToAddPage() {
    await this.router.navigate(['/streak/add']);
  }
}
