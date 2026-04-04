import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator } from '@angular/forms';
import { IonItem, IonList, IonInput, IonLabel } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { Selectable } from 'src/app/types/selectable';

@Component({
  selector: 'app-select-search',
  templateUrl: './select-search.component.html',
  styleUrls: ['./select-search.component.scss'],
  imports: [IonLabel, IonInput, IonList, IonItem, FormsModule, ReactiveFormsModule, TranslateModule, CommonModule],
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
export class SelectSearchComponent implements ControlValueAccessor, Validator, OnChanges {
  @Input() suggestions: Selectable<any>[] = [];
  @Input() label: string = '';
  
  filteredSuggestions: Selectable<any>[] = [];
  showSuggestions = false;
  selectedSuggestion: Selectable<any> | null = null;
  value: any = null;
  enteredText = '';

  private onChange = (_: any) => { };
  private onTouched = () => { };

  constructor() {}

  writeValue(value: any): void {
    this.value = value;
    this.restoreDisplay();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onInput(event: any) {
    const val = event.target.value ?? '';
    this.updateComponent(val);
  }

  updateComponent(value: any) {
    this.enteredText = value;

    if (
      this.enteredText != this.selectedSuggestion?.title
      || !this.enteredText
    ) {
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

    this.showSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => (this.showSuggestions = false), 200);
  }

  openSuggestions(event: any) {
    this.onInput(event);
  }

  updateValue(value: any) {
    this.value = value;
    this.onChange(this.value);
    this.onTouched();
  }

  setFilteredSuggestions() {
    this.filteredSuggestions = this.suggestions
      .filter((suggestion) =>
        suggestion.title.toLowerCase().includes(this.enteredText.toLowerCase())
      )
      .slice(0, 5);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (control.errors?.['required'] && !this.value) {
      return {
        required: true,
      };
    }

    if (!this.enteredText) {
      return null;
    }

    if (
      !this.suggestions.some(
        (suggestion) => suggestion.title == this.enteredText
      )
    ) {
      return {
        noSuchItem: {
          message: 'TK_THERE_S_NO_SUCH_ITEM_IN_THE_LIST',
        },
      }
    } else if (!control.value) {
      return {
        noSuchItem: {
          message: 'TK_ITEM_IS_NOT_SELECTED',
        },
      }
    }

    return null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['suggestions']) {
      this.onChange(this.value);
      this.restoreDisplay();
    }
  }

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
