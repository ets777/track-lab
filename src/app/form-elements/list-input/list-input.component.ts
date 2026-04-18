import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, forwardRef, Input, OnInit, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ItemService } from 'src/app/services/item.service';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { Selectable } from 'src/app/types/selectable';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';

@Component({
  imports: [IonButton, IonIcon, TranslateModule, CommonModule, ReactiveFormsModule, SelectSearchComponent],
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
export class ListInputComponent implements ControlValueAccessor, OnInit {
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);

  @Input() listId!: number;
  @Input() label: string = '';
  @Input() removable = false;
  @Output() removed = new EventEmitter<void>();

  innerControl = new FormControl('');
  allSuggestions: Selectable<string>[] = [];

  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor() {
    addIcons({ close });
    this.innerControl.valueChanges.subscribe(val => {
      this.onChange(val ?? '');
      this.onTouched();
    });
  }

  async ngOnInit() {
    const items = await this.itemService.getAllWhereEquals('listId', this.listId);
    this.allSuggestions = items.map((item, i) => ({ num: i, title: item.name, item: item.name }));
  }

  writeValue(value: string): void {
    this.innerControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  get inputLabel() {
    return `${this.label} (${this.translate.instant('TK_SEPARATED_BY_COMMA').toLowerCase()})`;
  }
}
