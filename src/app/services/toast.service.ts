import { Injectable } from '@angular/core';
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
    private toastEvent$ = new Subject<IToast>();
    private queue: IToast[] = [];
    private showing = false;
    private defaultDuration: number = 5000;

    constructor(
        private achievementService: AchievementService,
    ) {}

    emit(toast: IToast) {
        this.toastEvent$.next(toast);
    }

    onEvent() {
        return this.toastEvent$.asObservable();
    }

    enqueue(toast: IToast) {
        this.queue.push(toast);
        this.processQueue();
    }

    private processQueue() {
        if (this.showing || this.queue.length === 0) {
            return;
        }

        if (this.achievementService.isShowing()) {
            // the best solution would be combine achievement queue with 
            // toast one, but I'm to lazy
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
