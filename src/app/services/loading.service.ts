import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private state$ = new BehaviorSubject<{ visible: boolean; message: string }>({ visible: false, message: '' });
  private locked = false;

  tryLock(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  show(message: string) {
    this.state$.next({ visible: true, message });
  }

  hide() {
    this.locked = false;
    this.state$.next({ visible: false, message: '' });
  }

  getState() {
    return this.state$.asObservable();
  }
}
