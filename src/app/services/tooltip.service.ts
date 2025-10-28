import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TooltipService {
    private state = new BehaviorSubject<{ event: Event, message: string } | null>(null);

    state$ = this.state.asObservable();

    show(event: Event, message: string) {
        this.state.next({ event, message });
    }

    hide() {
        this.state.next(null);
    }
}
