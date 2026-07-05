import { Component, ElementRef, EventEmitter, Output, ViewChild, forwardRef, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ItemService } from 'src/app/services/item.service';

export interface ListInputSuggestion {
  name: string;
  subtitle?: string;
}

@Component({
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
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
export class ListInputComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);

  @Input() listId?: number;
  @Input() label: string = '';
  @Input() removable = false;
  /** When provided, these suggestions are used instead of loading items by listId. */
  @Input() suggestions?: ListInputSuggestion[];
  /** When true, only existing suggestions can be added — free text is rejected. */
  @Input() strict = false;
  @Output() removed = new EventEmitter<void>();

  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;

  innerControl = new FormControl('');
  inputText = '';
  filteredSuggestions: ListInputSuggestion[] = [];
  isFocused = false;
  private blurTimeout: any;

  private allSuggestions: ListInputSuggestion[] = [];
  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor() {
    this.innerControl.valueChanges.subscribe(() => {
      this.onChange(this.innerControl.value ?? '');
      this.onTouched();
    });
  }

  async ngOnInit() {
    if (this.suggestions) {
      this.allSuggestions = this.suggestions;
    } else if (this.listId != null) {
      const items = await this.itemService.getAllWhereEquals('listId', this.listId);
      this.allSuggestions = items.map(item => ({ name: item.name }));
    }
    this.updateSuggestions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['suggestions'] && this.suggestions) {
      this.allSuggestions = this.suggestions;
      this.updateSuggestions();
    }
  }

  ngOnDestroy() {
    clearTimeout(this.blurTimeout);
  }

  get chips(): string[] {
    return (this.innerControl.value ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  get translatedLabel(): string {
    return this.translate.instant(this.label);
  }

  get showDropdown(): boolean {
    return this.isFocused && this.filteredSuggestions.length > 0;
  }

  get canConfirm(): boolean {
    const trimmed = this.inputText.trim();
    if (!trimmed) return false;
    if (this.strict) return this.matchSuggestion(trimmed) !== undefined;
    return true;
  }

  private matchSuggestion(name: string): ListInputSuggestion | undefined {
    return this.allSuggestions.find(s => s.name.toLowerCase() === name.toLowerCase());
  }

  writeValue(value: string): void {
    this.innerControl.setValue(value || '', { emitEvent: false });
    this.updateSuggestions();
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  addChip(name: string, closeDropdown = false) {
    let trimmed = name.trim();
    if (!trimmed) return;
    if (this.strict) {
      const match = this.matchSuggestion(trimmed);
      if (!match) return;
      trimmed = match.name;
    }
    const current = this.chips;
    if (!current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      current.push(trimmed);
      this.innerControl.setValue(current.join(', '));
    }
    this.inputText = '';
    if (closeDropdown) this.inputEl?.nativeElement.blur();
    this.updateSuggestions();
  }

  removeChip(index: number) {
    const current = this.chips;
    current.splice(index, 1);
    this.innerControl.setValue(current.join(', '));
    this.updateSuggestions();
  }

  onFocus() {
    clearTimeout(this.blurTimeout);
    this.isFocused = true;
    this.updateSuggestions();
  }

  onBlur() {
    this.blurTimeout = setTimeout(() => { this.isFocused = false; }, 150);
  }

  onKeydown(event: KeyboardEvent) {
    if ((event.key === 'Enter' || event.key === ',') && this.inputText.trim()) {
      event.preventDefault();
      this.addChip(this.inputText.trim());
    } else if (event.key === 'Backspace' && !this.inputText && this.chips.length) {
      this.removeChip(this.chips.length - 1);
    }
  }

  onTextInput(event: Event) {
    this.inputText = (event.target as HTMLInputElement).value;
    this.updateSuggestions();
  }

  confirmInput() {
    if (this.inputText.trim()) {
      this.addChip(this.inputText.trim(), true);
    }
  }

  updateSuggestions() {
    const query = this.inputText.toLowerCase().trim();
    const currentChips = new Set(this.chips.map(c => c.toLowerCase()));
    this.filteredSuggestions = this.allSuggestions
      .filter(s => !currentChips.has(s.name.toLowerCase()) && (!query || s.name.toLowerCase().includes(query)))
      .slice(0, 6);
  }
}
