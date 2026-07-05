import { Component, inject } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { IAchievement } from 'src/app/db/models/achievement';
import { AchievementService } from 'src/app/services/achievement.service';
import { TranslateModule } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';
import { AchievementsListComponent } from 'src/app/components/achievements-list/achievements-list.component';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.page.html',
  styleUrls: ['./achievements.page.scss'],
  imports: [IonTitle, IonToolbar, IonHeader, IonContent, TranslateModule, AchievementsListComponent, DefaultSkeletonComponent, NavButtonComponent],
})
export class AchievementsPage {
  private achievementService = inject(AchievementService);
  private navigationService = inject(NavigationService);

  get showBackButton(): boolean {
    return this.navigationService.fromDashboard;
  }

  achievements: IAchievement[] = [];
  loading = true;

  async ionViewDidEnter() {
    try {
      const unlockAll = (await Preferences.get({ key: 'unlock-all-achievements' }))?.value === 'true';
      this.achievements = unlockAll
        ? await this.achievementService.getAll()
        : await this.achievementService.getUnlocked();
    } finally {
      this.loading = false;
    }
  }
}
