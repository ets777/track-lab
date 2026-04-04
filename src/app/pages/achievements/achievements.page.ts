import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonList, IonItem, IonContent, IonHeader, IonToolbar, IonButtons, IonTitle, IonMenuButton } from '@ionic/angular/standalone';
import { IAchievement } from 'src/app/db/models/achievement';
import { AchievementService } from 'src/app/services/achievement.service';
import { TranslateModule } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.page.html',
  styleUrls: ['./achievements.page.scss'],
  imports: [IonTitle, IonButtons, IonToolbar, IonHeader, IonContent, IonItem, IonList, CommonModule, FormsModule, TranslateModule, IonMenuButton],
})
export class AchievementsPage {
  private achievementService = inject(AchievementService);

  achievements: IAchievement[] = [];

  async ionViewDidEnter() {
    const unlockAll = (await Preferences.get({ key: 'unlock-all-achievements' }))?.value === 'true';
    this.achievements = unlockAll
      ? await this.achievementService.getAll()
      : await this.achievementService.getUnlocked();
  }

}
