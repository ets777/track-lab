import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface IToast {
    title: string,
    type?: ('info' | 'warning' | 'error' | 'success' | 'waiting'),
    icon?: string,
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private toastEvent$ = new Subject<IToast>();
    private queue: IToast[] = [];
    private showing = false;

    constructor() {}

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

        const next = this.queue.shift()!;
        this.showing = true;

        this.toastEvent$.next(next);

        setTimeout(() => {
            this.showing = false;
            this.processQueue();
        }, 5000);
    }
}
