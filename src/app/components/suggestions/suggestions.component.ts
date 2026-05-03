import { Component, ElementRef, Input, Output, EventEmitter, OnChanges, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
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
export class SuggestionsComponent implements OnChanges, OnInit, OnDestroy {
  @Input() set suggestions(val: string[] | SuggestionItem[]) {
    this._suggestions = (val as any[]).map(s =>
      typeof s === 'string' ? { label: s } : s
    );
    this.updatePosition();
  }

  @Input() anchor: HTMLElement | null = null;
  @Output() selected = new EventEmitter<string>();

  _suggestions: SuggestionItem[] = [];
  top = 0;
  left = 0;
  width = 0;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    const ionApp = document.querySelector('ion-app');
    if (ionApp) {
      ionApp.appendChild(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    this.el.nativeElement.remove();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['anchor']) {
      this.updatePosition();
    }
  }

  private updatePosition() {
    if (!this.anchor) return;
    const rect = this.anchor.getBoundingClientRect();
    this.top = rect.bottom;
    this.left = rect.left;
    this.width = rect.width;
  }
}
