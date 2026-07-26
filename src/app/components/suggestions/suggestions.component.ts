import { Component, ElementRef, Input, Output, EventEmitter, OnChanges, OnInit, OnDestroy, AfterViewInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

export interface SuggestionItem {
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, TranslateModule],
  templateUrl: './suggestions.component.html',
  styleUrl: './suggestions.component.scss',
})
export class SuggestionsComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input() set suggestions(val: string[] | SuggestionItem[]) {
    this._suggestions = (val as any[]).map(s =>
      typeof s === 'string' ? { label: s } : s
    );
    this.scheduleUpdatePosition();
  }

  @Input() anchor: HTMLElement | null = null;
  @Output() selected = new EventEmitter<string>();

  _suggestions: SuggestionItem[] = [];

  private el = inject(ElementRef);

  ngOnInit() {
    const ionApp = document.querySelector('ion-app');
    if (ionApp) {
      ionApp.appendChild(this.el.nativeElement);
    }
    const host = this.el.nativeElement as HTMLElement;
    host.style.position = 'absolute';
    host.style.zIndex = '99990';
    host.style.display = 'block';
  }

  ngAfterViewInit() {
    this.scheduleUpdatePosition();
  }

  ngOnDestroy() {
    this.el.nativeElement.remove();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['anchor']) {
      this.scheduleUpdatePosition();
    }
  }

  private scheduleUpdatePosition() {
    requestAnimationFrame(() => {
      if (!this.anchor) return;
      const rect = this.anchor.getBoundingClientRect();
      const host = this.el.nativeElement as HTMLElement;
      host.style.top = rect.bottom + 'px';
      host.style.left = rect.left + 'px';
      host.style.width = rect.width + 'px';
    });
  }
}
