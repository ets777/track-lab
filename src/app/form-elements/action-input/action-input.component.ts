import { Component, ElementRef, ViewChild, forwardRef, OnInit, inject, OnDestroy } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ActionService } from 'src/app/services/action.service';

@Component({
  selector: 'app-action-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './action-input.component.html',
  styleUrl: './action-input.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ActionInputComponent),
    multi: true,
  }],
})
export class ActionInputComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private actionService = inject(ActionService);

  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;

  innerControl = new FormControl('');
  inputText = '';
  suggestions: string[] = [];
  isFocused = false;
  private blurTimeout: any;

  private allActionSuggestions: string[] = [];
  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor() {
    this.innerControl.valueChanges.subscribe(() => {
      this.onChange(this.innerControl.value ?? '');
      this.onTouched();
    });
  }

  async ngOnInit() {
    const actions = await this.actionService.getAllUnhidden();
    this.allActionSuggestions = actions.map(a => a.name);
    this.updateSuggestions();
  }

  ngOnDestroy() {
    clearTimeout(this.blurTimeout);
  }

  get chips(): string[] {
    return (this.innerControl.value ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  get showDropdown(): boolean {
    return this.isFocused && this.suggestions.length > 0;
  }

  get canConfirm(): boolean {
    return this.inputText.trim().length > 0;
  }

  writeValue(value: string): void {
    this.innerControl.setValue(value || '', { emitEvent: false });
    this.updateSuggestions();
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  addChip(name: string, closeDropdown = false) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.chips;
    if (!current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      current.push(trimmed);
      this.innerControl.setValue(current.join(', '));
    }
    this.inputText = '';
    if (closeDropdown) {
      this.inputEl?.nativeElement.blur();
    }
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
      this.addChip(this.inputText.trim());
    }
  }

  updateSuggestions() {
    const query = this.inputText.toLowerCase().trim();
    const currentChips = new Set(this.chips.map(c => c.toLowerCase()));
    this.suggestions = this.allActionSuggestions
      .filter(s => !currentChips.has(s.toLowerCase()) && (!query || s.toLowerCase().includes(query)))
      .slice(0, 6);
  }
}
