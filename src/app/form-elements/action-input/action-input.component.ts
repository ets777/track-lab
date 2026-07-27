import { Component, ElementRef, Input, ViewChild, forwardRef, OnInit, inject, OnDestroy } from '@angular/core';
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

  /** Only one action may be picked — adding a second one replaces the first. */
  @Input() single = false;

  /** Free text is refused; only names present in the suggestion list are accepted. */
  @Input() strict = false;

  /** Action names never offered as suggestions (e.g. the action being replaced). */
  @Input() exclude: string[] = [];

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

  /** In single mode the text field disappears once an action has been picked. */
  get showInput(): boolean {
    return !this.single || this.chips.length === 0;
  }

  get canConfirm(): boolean {
    const trimmed = this.inputText.trim();

    if (!trimmed) {
      return false;
    }

    return !this.strict || !!this.matchSuggestion(trimmed);
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

    const resolved = this.strict ? this.matchSuggestion(trimmed) : trimmed;
    if (!resolved) return;

    if (this.single) {
      this.innerControl.setValue(resolved);
    } else {
      const current = this.chips;
      if (!current.some(c => c.toLowerCase() === resolved.toLowerCase())) {
        current.push(resolved);
        this.innerControl.setValue(current.join(', '));
      }
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
      this.addChip(this.inputText.trim(), this.single);
    } else if (event.key === 'Backspace' && !this.inputText && this.chips.length) {
      this.removeChip(this.chips.length - 1);
    }
  }

  onTextInput(event: Event) {
    this.inputText = (event.target as HTMLInputElement).value;
    this.updateSuggestions();
  }

  confirmInput() {
    if (this.canConfirm) {
      this.addChip(this.inputText.trim(), true);
    }
  }

  updateSuggestions() {
    const query = this.inputText.toLowerCase().trim();
    const taken = new Set([
      ...this.chips.map(c => c.toLowerCase()),
      ...this.exclude.map(e => e.toLowerCase()),
    ]);
    this.suggestions = this.allActionSuggestions
      .filter(s => !taken.has(s.toLowerCase()) && (!query || s.toLowerCase().includes(query)))
      .slice(0, 6);
  }

  /** Resolves free text to the canonically-cased suggestion it matches, if any. */
  private matchSuggestion(text: string): string | undefined {
    const lower = text.toLowerCase();
    const excluded = new Set(this.exclude.map(e => e.toLowerCase()));

    return this.allActionSuggestions.find(
      s => s.toLowerCase() === lower && !excluded.has(lower)
    );
  }
}
