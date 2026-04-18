import { CommonModule } from '@angular/common';
import { AfterContentInit, Component, ContentChild, ElementRef, EventEmitter, HostListener, Output, ViewChild, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator } from '@angular/forms';
import { IonItem, IonInput } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { Selectable } from 'src/app/types/selectable';
import { SuggestionsComponent, SuggestionItem } from 'src/app/components/suggestions/suggestions.component';

@Component({
  selector: 'app-select-search',
  templateUrl: './select-search.component.html',
  styleUrls: ['./select-search.component.scss'],
  imports: [IonInput, IonItem, FormsModule, ReactiveFormsModule, TranslateModule, CommonModule, SuggestionsComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectSearchComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: SelectSearchComponent,
      multi: true,
    },
  ],
})
export class SelectSearchComponent implements ControlValueAccessor, Validator, OnChanges, AfterContentInit {
  @ViewChild('inputItem', { read: ElementRef }) inputItemRef?: ElementRef;
  @ContentChild('selectSearchAnchor', { read: ElementRef }) customAnchor?: ElementRef;

  @Input() suggestions: Selectable<any>[] = [];
  @Input() label: string = '';
  @Input() multiple = false;
  @Output() selected = new EventEmitter<any>();

  filteredSuggestions: Selectable<any>[] = [];
  showSuggestions = false;
  hasCustomInputMode = false;
  isFocused = false;

  // single mode state
  selectedSuggestion: Selectable<any> | null = null;
  value: any = null;

  // multiple mode state
  enteredText = '';

  private onChange = (_: any) => { };
  private onTouched = () => { };

  ngAfterContentInit() {
    this.hasCustomInputMode = !!this.customAnchor;
  }

  get anchorEl(): HTMLElement | null {
    return this.customAnchor?.nativeElement ?? this.inputItemRef?.nativeElement ?? null;
  }

  get suggestionItems(): SuggestionItem[] {
    return this.filteredSuggestions.map(s => ({ label: s.title, sublabel: s.subtitle }));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['suggestions']) {
      if (this.hasCustomInputMode) {
        this.filteredSuggestions = this.suggestions;
        this.showSuggestions = this.isFocused && this.filteredSuggestions.length > 0;
      } else if (!this.multiple) {
        this.onChange(this.value);
        this.restoreDisplay();
      }
    }
  }

  // ─── built-in input handlers (non-projected content) ─────────────────────

  onInput(event: any) {
    const val = event.target.value ?? '';
    if (this.multiple) {
      this.enteredText = val;
      this.updateValue(val);
      this.setFilteredSuggestions();
      this.showSuggestions = this.filteredSuggestions.length > 0;
    } else {
      this.updateComponent(val);
    }
  }

  openSuggestions(event: any) {
    if (this.multiple) {
      // don't show suggestions on focus — only while actively typing
    } else {
      this.onInput(event);
    }
  }

  hideSuggestions() {
    setTimeout(() => (this.showSuggestions = false), 200);
  }

  // ─── host listeners for projected content ────────────────────────────────

  @HostListener('ionFocus')
  onHostFocus() {
    if (!this.hasCustomInputMode) return;
    this.isFocused = true;
    this.showSuggestions = this.filteredSuggestions.length > 0;
  }

  @HostListener('ionBlur')
  onHostBlur() {
    if (!this.hasCustomInputMode) return;
    setTimeout(() => {
      this.isFocused = false;
      this.showSuggestions = false;
    }, 200);
  }

  // ─── suggestion filtering ─────────────────────────────────────────────────

  setFilteredSuggestions() {
    if (this.multiple) {
      const parts = this.enteredText.split(',');
      const current = parts[parts.length - 1]?.trim() ?? '';
      const alreadyEntered = parts.slice(0, -1).map(p => p.trim().toLowerCase());

      if (current.length === 0) {
        this.filteredSuggestions = [];
        return;
      }

      this.filteredSuggestions = this.suggestions
        .filter(s => !alreadyEntered.includes(s.title.toLowerCase()))
        .filter(s => s.title.toLowerCase().includes(current.toLowerCase()))
        .slice(0, 5);
    } else {
      this.filteredSuggestions = this.suggestions
        .filter(s => s.title.toLowerCase().includes(this.enteredText.toLowerCase()))
        .slice(0, 5);
    }
  }

  // ─── suggestion selection ─────────────────────────────────────────────────

  onSuggestionSelected(label: string) {
    if (this.multiple) {
      if (this.hasCustomInputMode) {
        this.selected.emit(label);
        this.filteredSuggestions = [];
        this.showSuggestions = false;
      } else {
        const parts = this.enteredText.split(',');
        parts[parts.length - 1] = ' ' + label;
        const newVal = parts.join(',').trim();
        this.enteredText = newVal;
        this.updateValue(newVal);
        this.showSuggestions = false;
      }
    } else {
      const suggestion = this.filteredSuggestions.find(s => s.title === label);
      if (suggestion) this.selectSuggestion(suggestion);
    }
  }

  // ─── single mode ──────────────────────────────────────────────────────────

  updateComponent(value: any) {
    this.enteredText = value;
    if (this.enteredText != this.selectedSuggestion?.title || !this.enteredText) {
      this.selectedSuggestion = null;
      this.updateValue(null);
    }
    this.setFilteredSuggestions();
    this.showSuggestions = this.filteredSuggestions.length > 0;
  }

  selectSuggestion(suggestion: Selectable<any>) {
    this.selectedSuggestion = suggestion;
    this.enteredText = suggestion.title;
    this.updateValue(suggestion.item);
    this.selected.emit(suggestion.item);
    this.showSuggestions = false;
  }

  // ─── ControlValueAccessor ─────────────────────────────────────────────────

  writeValue(value: any): void {
    if (this.multiple) {
      this.enteredText = value || '';
      this.value = value || '';
    } else {
      this.value = value;
      this.restoreDisplay();
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  updateValue(value: any) {
    this.value = value;
    this.onChange(this.value);
    this.onTouched();
  }

  // ─── Validator ────────────────────────────────────────────────────────────

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.multiple) return null;

    if (control.errors?.['required'] && !this.value) {
      return { required: true };
    }
    if (!this.enteredText) return null;
    if (!this.suggestions.some(s => s.title == this.enteredText)) {
      return { noSuchItem: { message: 'TK_THERE_S_NO_SUCH_ITEM_IN_THE_LIST' } };
    } else if (!control.value) {
      return { noSuchItem: { message: 'TK_ITEM_IS_NOT_SELECTED' } };
    }
    return null;
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private restoreDisplay() {
    if (!this.value) {
      this.selectedSuggestion = null;
      this.enteredText = '';
      return;
    }
    const suggestion = this.suggestions.find(
      s => s.item?.type === this.value?.type && s.item?.itemId === this.value?.itemId
    );
    if (suggestion) {
      this.selectedSuggestion = suggestion;
      this.enteredText = suggestion.title;
    }
  }
}
