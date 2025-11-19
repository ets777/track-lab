import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';
import { IActivity } from 'src/app/db/models/activity';
import { IAction } from 'src/app/db/models/action';
import { IActivityAction } from 'src/app/db/models/activity-action';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { ActionService } from 'src/app/services/action.service';
import { ActivityService } from 'src/app/services/activity.service';
import { TranslateModule } from '@ngx-translate/core';
import { entitiesToString } from 'src/app/functions/string';
import { IAchievement } from 'src/app/db/models/achievement';
import { AchievementService } from 'src/app/services/achievement.service';
import { BackupService } from 'src/app/services/backup.service';

@Component({
  selector: 'app-database',
  templateUrl: './database.page.html',
  styleUrls: ['./database.page.scss'],
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule]
})
export class DatabasePage implements OnInit {
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private activityActionService = inject(ActivityActionService);
  private achievementService = inject(AchievementService);
  private backupService = inject(BackupService);

  entitiesToString = entitiesToString;
  activities: IActivity[] = [];
  actions: IAction[] = [];
  activityActions: IActivityAction[] = [];
  achievements: IAchievement[] = [];

  async ngOnInit() {
    this.activities = await this.activityService.getAllEnriched();
    this.actions = await this.actionService.getAllEnriched();
    this.activityActions = await this.activityActionService.getAll();
    this.achievements = await this.achievementService.getAll();
  }

  async clearDatabase() {
    await this.backupService.clearDatabase();
  }
}
