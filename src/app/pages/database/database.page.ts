import { Component, OnInit } from '@angular/core';
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
import { actionsToString } from 'src/app/functions/action';
import { IAchievement } from 'src/app/db/models/achievement';
import { AchievementService } from 'src/app/services/achievement.service';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-database',
  templateUrl: './database.page.html',
  styleUrls: ['./database.page.scss'],
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule]
})
export class DatabasePage implements OnInit {
  actionsToString = actionsToString;
  activities: IActivity[] = [];
  actions: IAction[] = [];
  activityActions: IActivityAction[] = [];
  achievements: IAchievement[] = [];

  constructor(
    private activityService: ActivityService,
    private actionService: ActionService,
    private activityActionService: ActivityActionService,
    private achievementService: AchievementService,
    private databaseService: DatabaseService,
  ) { }

  async ngOnInit() {
    this.activities = await this.activityService.getAllEnriched();
    this.actions = await this.actionService.getAll();
    this.activityActions = await this.activityActionService.getAll();
    this.achievements = await this.achievementService.getAll();
  }

  async clearDatabase() {
    await this.databaseService.clearDatabase();
  }
}
