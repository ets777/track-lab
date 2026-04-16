import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, forwardRef, Input, OnInit, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonInput, IonItem, IonList, IonButton, IonIcon } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ItemService } from 'src/app/services/item.service';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  imports: [IonList, IonItem, IonInput, IonButton, IonIcon, TranslateModule, CommonModule],
  selector: 'app-list-input',
  templateUrl: './list-input.component.html',
  styleUrl: './list-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ListInputComponent),
      multi: true,
    },
  ],
})
export class ListInputComponent implements ControlValueAccessor, OnInit {
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);

  @Input() listId!: number;
  @Input() label: string = '';
  @Input() removable = false;
  @Output() removed = new EventEmitter<void>();

  filteredSuggestions: string[] = [];
  allSuggestions: string[] = [];
  showSuggestions = false;
  value: string = '';

  constructor() {
    addIcons({ close });
  }

  async ngOnInit() {
    const items = await this.itemService.getAllWhereEquals('listId', this.listId);
    this.allSuggestions = items.map((item) => item.name);
  }

  private onChange = (_: any) => { };
  private onTouched = () => { };

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  updateValue(value: string) {
    this.value = value;
    this.onChange(this.value);
    this.onTouched();
  }

  onInput(event: any) {
    const val = event.target.value;
    this.updateValue(val);

    const parts = val.split(',');
    const current = parts.at(-1).trim();

    if (current.length > 0) {
      this.filteredSuggestions = this.allSuggestions
        .filter((suggestion) =>
          suggestion.toLowerCase().includes(current.toLowerCase())
        )
        .slice(0, 5);
      this.showSuggestions = this.filteredSuggestions.length > 0;
    } else {
      this.showSuggestions = false;
    }
  }

  selectSuggestion(suggestion: string) {
    const parts = this.value.split(',') ?? [];

    if (!parts.length) {
      return;
    }

    parts[parts.length - 1] = ' ' + suggestion;
    this.updateValue(parts.join(',').trim());

    this.showSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => (this.showSuggestions = false), 200);
  }

  get inputLabel() {
    return `${this.label} (${this.translate.instant('TK_SEPARATED_BY_COMMA').toLowerCase()})`;
  }
}
