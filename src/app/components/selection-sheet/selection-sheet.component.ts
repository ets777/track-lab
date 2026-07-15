import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonContent, IonItem, IonLabel, IonInput, IonIcon, IonList } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

export interface SelectionSheetItem {
  id: string | number;
  title: string;
  subtitle?: string;
  data?: unknown;
}

/**
 * Actionsheet-style bottom sheet for picking one entity from a searchable list.
 * The parent owns filtering: it passes the already-filtered `items` and reacts
 * to `searchChange`. Selecting an item emits it and leaves closing to the parent
 * (set `isOpen` to false) or the user (drag handle / backdrop → `dismissed`).
 */
@Component({
  selector: 'app-selection-sheet',
  templateUrl: './selection-sheet.component.html',
  styleUrls: ['./selection-sheet.component.scss'],
  imports: [IonModal, IonContent, IonItem, IonLabel, IonInput, IonIcon, IonList, CommonModule, TranslateModule],
})
export class SelectionSheetComponent {
  @Input() isOpen = false;
  @Input() items: SelectionSheetItem[] = [];
  @Input() searchValue = '';
  @Input() placeholder = 'TK_SEARCH';
  @Input() emptyText = 'TK_THERE_ARE_NO_ENTRIES';

  @Output() searchChange = new EventEmitter<string>();
  @Output() selected = new EventEmitter<SelectionSheetItem>();
  @Output() dismissed = new EventEmitter<void>();

  constructor() {
    addIcons({ searchOutline });
  }

  onSearch(event: any) {
    this.searchChange.emit(event.detail.value ?? '');
  }
}
