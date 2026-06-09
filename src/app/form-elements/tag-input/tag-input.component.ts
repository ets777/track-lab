import { CommonModule } from '@angular/common';
import { Component, forwardRef, OnInit, OnDestroy, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TagService } from 'src/app/services/tag.service';

@Component({
  imports: [CommonModule, TranslateModule, ReactiveFormsModule],
  selector: 'app-tag-input',
  templateUrl: './tag-input.component.html',
  styleUrl: './tag-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagInputComponent),
      multi: true,
    },
  ],
})
export class TagInputComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private tagService = inject(TagService);

  innerControl = new FormControl('');
  inputText = '';
  suggestions: string[] = [];
  isFocused = false;
  private blurTimeout: any;

  private allTagNames: string[] = [];
  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor() {
    this.innerControl.valueChanges.subscribe(() => {
      this.onChange(this.innerControl.value ?? '');
      this.onTouched();
    });
  }

  async ngOnInit() {
    const tags = await this.tagService.getAllUnhidden();
    this.allTagNames = tags.map(t => t.name);
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

  addChip(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.chips;
    if (!current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      current.push(trimmed);
      this.innerControl.setValue(current.join(', '));
    }
    this.inputText = '';
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
    this.suggestions = this.allTagNames
      .filter(s => !currentChips.has(s.toLowerCase()) && (!query || s.toLowerCase().includes(query)))
      .slice(0, 6);
  }
}
