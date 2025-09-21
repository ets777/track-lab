import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type HookEvent =
    | { type: 'achievement.init'; payload: { newAchievementCodes: string[] } }
    | { type: 'activity.added'; payload: { activityId: number } }
    | { type: 'activity.updated'; payload: { activityId: number } }
    | { type: 'backup.made'; payload: { isPasswordSet: boolean } }
    | { type: 'homepage.visited'; payload: { } };

@Injectable({ providedIn: 'root' })
export class HookService {
    private event$ = new Subject<HookEvent>();

    emit(event: HookEvent) {
        this.event$.next(event);
    }

    onEvent() {
        return this.event$.asObservable();
    }
}
