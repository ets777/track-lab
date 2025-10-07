import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonList, IonItem, IonContent, IonHeader, IonToolbar, IonButtons, IonTitle, IonMenuButton } from '@ionic/angular/standalone';
import { IAchievement } from 'src/app/db/models/achievement';
import { AchievementService } from 'src/app/services/achievement.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.page.html',
  styleUrls: ['./achievements.page.scss'],
  imports: [IonTitle, IonButtons, IonToolbar, IonHeader, IonContent, IonItem, IonList, CommonModule, FormsModule, TranslateModule, IonMenuButton]
})
export class AchievementsPage implements OnInit {
  achievements: IAchievement[] = [];

  constructor(
    private achievementService: AchievementService,
  ) { }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    this.achievements = await this.achievementService.getUnlocked();
  }

}
