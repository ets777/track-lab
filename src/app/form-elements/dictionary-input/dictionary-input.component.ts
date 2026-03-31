import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input, OnInit, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonInput, IonItem, IonList } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TermService } from 'src/app/services/term.service';

@Component({
  imports: [IonList, IonItem, IonInput, TranslateModule, CommonModule],
  selector: 'app-dictionary-input',
  templateUrl: './dictionary-input.component.html',
  styleUrl: './dictionary-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DictionaryInputComponent),
      multi: true,
    },
  ],
})
export class DictionaryInputComponent implements ControlValueAccessor, OnInit {
  private termService = inject(TermService);
  private translate = inject(TranslateService);

  @Input() dictionaryId!: number;
  @Input() label: string = '';

  filteredSuggestions: string[] = [];
  allSuggestions: string[] = [];
  showSuggestions = false;
  value: string = '';

  async ngOnInit() {
    const terms = await this.termService.getAllWhereEquals('dictionaryId', this.dictionaryId);
    this.allSuggestions = terms.map((term) => term.name);
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
