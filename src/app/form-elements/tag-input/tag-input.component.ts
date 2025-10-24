import { CommonModule } from '@angular/common';
import { Component, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonInput, IonItem, IonList } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { TagService } from 'src/app/services/tag.service';

@Component({
  imports: [IonList, IonItem, IonInput, TranslateModule, CommonModule],
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
export class TagInputComponent implements ControlValueAccessor, OnInit {
  filteredSuggestions: string[] = [];
  allSuggestions: string[] = [];
  showSuggestions = false;
  value: string = '';

  constructor(
    private tagService: TagService,
  ) {

  }

  async ngOnInit() {
    const tags = await this.tagService.getAll();
    this.allSuggestions = tags.map((tag) => tag.name);
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
    let parts = this.value.split(',') ?? [];
    
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
}