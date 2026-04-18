import { CommonModule } from '@angular/common';
import { Component, forwardRef, OnInit, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TagService } from 'src/app/services/tag.service';
import { Selectable } from 'src/app/types/selectable';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';

@Component({
  imports: [CommonModule, TranslateModule, ReactiveFormsModule, SelectSearchComponent],
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
  private tagService = inject(TagService);
  private translate = inject(TranslateService);

  innerControl = new FormControl('');
  allTags: Selectable<string>[] = [];

  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor() {
    this.innerControl.valueChanges.subscribe(val => {
      this.onChange(val ?? '');
      this.onTouched();
    });
  }

  async ngOnInit() {
    const tags = await this.tagService.getAllUnhidden();
    this.allTags = tags.map((tag, i) => ({ num: i, title: tag.name, item: tag.name }));
  }

  writeValue(value: string): void {
    this.innerControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  get label() {
    return `${this.translate.instant('TK_TAGS')} (${this.translate.instant('TK_SEPARATED_BY_COMMA').toLowerCase()})`;
  }
}
