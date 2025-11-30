import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';

@Component({
  selector: 'app-streak-list',
  templateUrl: './streak-list.page.html',
  styleUrls: ['./streak-list.page.scss'],
  standalone: true,
  imports: [IonButtons, IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonMenuButton],
})
export class StreakListPage {
  private streakService = inject(StreakService);

  streaks: IStreak[] = [];

  async ionViewDidEnter() {
    await this.fetchStreaks();
  }

  async fetchStreaks() {
    this.streaks = await this.streakService.getAll();
  }
}
