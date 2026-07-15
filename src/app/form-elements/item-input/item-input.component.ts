import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CommonItem, Selectable } from 'src/app/types/selectable';

/**
 * Chip input for picking a single library item (action / tag / list item) —
 * same UX and visual as app-metric-input, but strictly selects one CommonItem
 * from a provided suggestion list. Value is a CommonItem | null.
 */
@Component({
  imports: [CommonModule, TranslateModule],
  selector: 'app-item-input',
  templateUrl: './item-input.component.html',
  styleUrl: './item-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ItemInputComponent),
      multi: true,
    },
  ],
})
export class ItemInputComponent implements ControlValueAccessor {
  @Input() suggestions: Selectable<CommonItem>[] = [];
  @Input() placeholder = 'TK_ITEM';

  selected: CommonItem | null = null;
  selectedTitle = '';
  inputText = '';
  isFocused = false;
  private blurTimeout: any;

  private onChange = (_: CommonItem | null) => {};
  private onTouched = () => {};

  get atMax(): boolean {
    return this.selected !== null;
  }

  get filteredSuggestions(): Selectable<CommonItem>[] {
    const query = this.inputText.toLowerCase().trim();
    return this.suggestions
      .filter(s => !query || s.title.toLowerCase().includes(query))
      .slice(0, 6);
  }

  get showDropdown(): boolean {
    return this.isFocused && !this.atMax && this.filteredSuggestions.length > 0;
  }

  writeValue(value: CommonItem | null): void {
    this.selected = value ?? null;
    if (this.selected) {
      const match = this.suggestions.find(
        s => s.item.itemId === this.selected!.itemId && s.item.type === this.selected!.type,
      );
      this.selectedTitle = match ? match.title : this.selected.name;
    } else {
      this.selectedTitle = '';
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  select(suggestion: Selectable<CommonItem>) {
    this.selected = suggestion.item;
    this.selectedTitle = suggestion.title;
    this.inputText = '';
    this.onChange(this.selected);
    this.onTouched();
  }

  clear() {
    this.selected = null;
    this.selectedTitle = '';
    this.onChange(null);
    this.onTouched();
  }

  onFocus() {
    clearTimeout(this.blurTimeout);
    this.isFocused = true;
  }

  onBlur() {
    this.blurTimeout = setTimeout(() => { this.isFocused = false; }, 150);
  }

  onTextInput(event: Event) {
    this.inputText = (event.target as HTMLInputElement).value;
  }
}
