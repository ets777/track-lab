import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AchievementService } from 'src/app/services/achievement.service';

@Component({
    selector: 'app-achievement-toast',
    templateUrl: './achievement-toast.component.html',
    styleUrls: ['./achievement-toast.component.scss'],
    imports: [TranslateModule],
})
export class AchievementToastComponent implements OnInit {
    title = '';
    icon = '';
    visible = false;

    constructor(private achievementService: AchievementService) { }

    ngOnInit() {
        this.achievementService.onEvent().subscribe(
            (achievement) => {
                this.show(achievement.title, achievement.icon ?? '🏆');
            }
        );
    }

    show(title: string, icon: string) {
        this.title = title;
        this.icon = icon;
        this.visible = true;
        setTimeout(() => this.visible = false, 5000);
    }

}
