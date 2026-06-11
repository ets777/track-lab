import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { AchievementService } from './achievement.service';

export interface IToast {
  title: string,
  type?: ('info' | 'warning' | 'error' | 'success' | 'waiting'),
  icon?: string,
  duration?: number,
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private achievementService = inject(AchievementService);

  private toastEvent$ = new Subject<IToast>();
  private queue: IToast[] = [];
  private showing = false;
  private ready = false;
  private defaultDuration: number = 3000;

  emit(toast: IToast) {
    this.toastEvent$.next(toast);
  }

  onEvent() {
    return this.toastEvent$.asObservable();
  }

  // Called by ToastComponent once it has subscribed. Toasts enqueued during
  // app initialization (before the component exists) are held until then.
  markReady() {
    this.ready = true;
    this.processQueue();
  }

  enqueue(toast: IToast) {
    this.queue.push(toast);
    this.processQueue();
  }

  private processQueue() {
    if (!this.ready || this.showing || this.queue.length === 0) {
      return;
    }

    if (this.achievementService.isShowing()) {
      // the best solution would be combine achievement queue with 
      // toast one, but I'm too lazy
      setTimeout(() => {
        this.processQueue();
      }, this.defaultDuration);

      return;
    }

    const next = this.queue.shift()!;
    this.showing = true;

    this.toastEvent$.next(next);

    setTimeout(() => {
      this.showing = false;
      this.processQueue();
    }, next.duration ?? this.defaultDuration);
  }

  getDefaultDuration() {
    return this.defaultDuration;
  }
}
