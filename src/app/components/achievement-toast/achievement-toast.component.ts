import { Component, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AchievementService } from 'src/app/services/achievement.service';

interface QueueItem {
  title: string;
  icon: string;
}

@Component({
  selector: 'app-achievement-toast',
  templateUrl: './achievement-toast.component.html',
  styleUrls: ['./achievement-toast.component.scss'],
  imports: [TranslateModule],
})
export class AchievementToastComponent implements OnInit {
  private achievementService = inject(AchievementService);

  title = '';
  icon = '';
  visible = false;
  closing = false;
  queue: QueueItem[] = [];

  private hideTimeout?: ReturnType<typeof setTimeout>;
  private closeAnimTimeout?: ReturnType<typeof setTimeout>;
  private touchStartY = 0;
  private touchCurrentY = 0;

  ngOnInit() {
    this.achievementService.onEvent().subscribe(achievement => {
      this.enqueue(achievement.title, achievement.icon ?? '🏆');
    });
  }

  enqueue(title: string, icon: string) {
    this.queue = [...this.queue, { title, icon }];
    if (!this.visible && !this.closing) {
      this.showNext();
    }
  }

  private showNext() {
    const next = this.queue[0];
    if (!next) return;
    clearTimeout(this.hideTimeout);
    clearTimeout(this.closeAnimTimeout);
    this.title = next.title;
    this.icon = next.icon;
    this.closing = false;
    this.visible = true;
    this.hideTimeout = setTimeout(() => this.close(), 5000);
  }

  close() {
    clearTimeout(this.hideTimeout);
    this.closing = true;
    this.closeAnimTimeout = setTimeout(() => {
      this.queue = this.queue.slice(1);
      this.closing = false;
      if (this.queue.length > 0) {
        this.showNext();
      } else {
        this.visible = false;
      }
    }, 300);
  }

  closeAll() {
    clearTimeout(this.hideTimeout);
    clearTimeout(this.closeAnimTimeout);
    this.queue = [];
    this.closing = true;
    this.closeAnimTimeout = setTimeout(() => {
      this.visible = false;
      this.closing = false;
    }, 300);
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartY = e.touches[0].clientY;
    this.touchCurrentY = e.touches[0].clientY;
  }

  onTouchMove(e: TouchEvent) {
    this.touchCurrentY = e.touches[0].clientY;
  }

  onTouchEnd() {
    if (this.touchCurrentY - this.touchStartY > 50) {
      this.close();
    }
  }
}
