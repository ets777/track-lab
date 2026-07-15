import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IAchievement } from 'src/app/db/models/achievement';

@Component({
  selector: 'app-achievements-list',
  templateUrl: './achievements-list.component.html',
  styleUrls: ['./achievements-list.component.scss'],
  imports: [TranslateModule],
})
export class AchievementsListComponent {
  @Input() achievements: IAchievement[] = [];
}
