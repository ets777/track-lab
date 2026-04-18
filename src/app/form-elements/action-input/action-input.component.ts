import { CommonModule } from '@angular/common';
import { Component, ViewChild, forwardRef, OnInit, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActionService } from 'src/app/services/action.service';
import { Selectable } from 'src/app/types/selectable';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { getPartIndex } from 'src/app/functions/string';

@Component({
  selector: 'app-action-input',
  standalone: true,
  imports: [IonItem, IonLabel, IonTextarea, TranslateModule, CommonModule, ReactiveFormsModule, SelectSearchComponent],
  templateUrl: './action-input.component.html',
  styleUrl: './action-input.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ActionInputComponent),
    multi: true,
  }],
})
export class ActionInputComponent implements ControlValueAccessor, OnInit {
  private actionService = inject(ActionService);
  private translate = inject(TranslateService);

  @ViewChild('actionsInput') actionsInput!: IonTextarea;

  innerControl = new FormControl('');
  filteredActionSelectables: Selectable<string>[] = [];

  private allActionSuggestions: string[] = [];
  private actionInputCaretPosition = 0;
  private actionInputText = '';

  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor() {
    this.innerControl.valueChanges.subscribe(val => {
      this.onChange(val ?? '');
      this.onTouched();
    });
  }

  async ngOnInit() {
    const actions = await this.actionService.getAllUnhidden();
    this.allActionSuggestions = actions.map(a => a.name);
  }

  writeValue(value: string): void {
    this.innerControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  async updateCaretAndText(event: any) {
    const indexBefore = getPartIndex(this.actionInputText, this.actionInputCaretPosition);
    this.actionInputText = event.detail?.value ?? event.target?.value ?? this.actionInputText;
    const nativeInput = await this.actionsInput.getInputElement();
    this.actionInputCaretPosition = nativeInput.selectionStart ?? 0;
    const indexAfter = getPartIndex(this.actionInputText, this.actionInputCaretPosition);
    if (indexBefore !== indexAfter) {
      this.filteredActionSelectables = [];
    }
  }

  async onInput(event: any) {
    await this.updateCaretAndText(event);
    this.innerControl.setValue(this.actionInputText, { emitEvent: true });

    const parts = this.actionInputText
      .split(',')
      .map((s: string) => s.toLowerCase().trim());
    const currentIndex = getPartIndex(this.actionInputText, this.actionInputCaretPosition);
    const current = parts[currentIndex];
    const otherParts = parts.filter((_, i) => i !== currentIndex);

    if (current?.length > 0) {
      const filtered = this.allActionSuggestions
        .filter(s => s.toLowerCase().includes(current) && !otherParts.includes(s.toLowerCase()))
        .slice(0, 5);
      this.filteredActionSelectables = filtered.map((s, i) => ({ num: i, title: s, item: s }));
    } else {
      this.filteredActionSelectables = [];
    }
  }

  selectSuggestion(suggestion: string) {
    const text = this.innerControl.value ?? '';
    const currentIndex = getPartIndex(text, this.actionInputCaretPosition);
    const parts = text.split(',');
    if (!parts.length) return;
    parts[currentIndex] = ' ' + suggestion;
    this.innerControl.setValue(parts.join(',').trim());
    this.filteredActionSelectables = [];
  }

  get label() {
    return `${this.translate.instant('TK_ACTIONS')} (${this.translate.instant('TK_SEPARATED_BY_COMMA').toLowerCase()})`;
  }
}
