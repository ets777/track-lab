import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator } from '@angular/forms';
import { IonItem, IonList, IonInput, IonLabel } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export type Selectable<T> = {
  num: number;
  title: string;
  subtitle?: string;
  item: T; 
}

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
      multi: true,
      useExisting: SelectSearchComponent,
    },
  ],
})
export class SelectSearchComponent implements ControlValueAccessor, Validator {
  @Input() suggestions: Selectable<any>[] = [];
  @Input() label: string = '';
  
  filteredSuggestions: Selectable<any>[] = [];
  showSuggestions = false;
  selectedSuggestion: Selectable<any> | null = null;
  value: any = null;
  enteredText = '';

  private onChange = (_: any) => { };
  private onTouched = () => { };

  constructor(
    private translate: TranslateService,
  ) {}

  async ngOnInit() {
  }

  writeValue(value: Selectable<any>): void {
    this.value = value ?? {
      num: 0,
      title: '',
      item: null,
    };
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // optional: handle disabled
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
      this.changeValue(null);
    }

    this.setFilteredSuggestions();

    this.showSuggestions = this.filteredSuggestions.length > 0;
  }

  selectSuggestion(suggestion: Selectable<any>) {
    this.selectedSuggestion = suggestion;
    this.enteredText = suggestion.title;
    this.changeValue(suggestion.item);

    this.showSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => (this.showSuggestions = false), 200);
  }

  openSuggestions(event: any) {
    this.onInput(event);
  }

  changeValue(value: any) {
    this.value = value;
    this.onChange(this.value);
    this.onTouched();
  }

  setFilteredSuggestions() {
    this.filteredSuggestions = this.suggestions
      .filter((suggestion) =>
        suggestion.title.toLowerCase().startsWith(this.enteredText.toLowerCase())
      )
      .slice(0, 5);
  }

  validate(control: AbstractControl): ValidationErrors | null {
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
    }
  }
}
