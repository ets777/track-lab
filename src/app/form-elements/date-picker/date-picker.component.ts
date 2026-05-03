import { Component, ChangeDetectorRef, EventEmitter, Input, Output, ViewEncapsulation, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { formatDisplayDate } from 'src/app/functions/date';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
  imports: [IonButton, TranslateModule],
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() hideTrigger = false;
  @Output() dateSelected = new EventEmitter<string>();

  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  protected value = '';
  protected isOpen = false;
  private isOpening = false;

  protected viewYear = 0;
  protected viewMonth = 0;
  protected selectedYear = 0;
  protected selectedMonth = 0;
  protected selectedDay = 0;
  protected cells: (number | null)[] = [];

  protected readonly weekdays = [
    'TK_CAL_MON', 'TK_CAL_TUE', 'TK_CAL_WED', 'TK_CAL_THU',
    'TK_CAL_FRI', 'TK_CAL_SAT', 'TK_CAL_SUN',
  ];

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string): void {
    this.value = v ?? '';
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(): void {}

  get displayValue(): string {
    const d = this.parseDate(this.value);
    if (!d) return '';
    const lang = this.translate.currentLang || 'en';
    return formatDisplayDate(this.value, lang);
  }

  get monthLabel(): string {
    const d = new Date(this.viewYear, this.viewMonth, 1);
    const lang = this.translate.currentLang || 'en';
    const label = d.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  openPicker(): void {
    if (this.isOpen || this.isOpening) return;
    this.isOpening = true;
    this.onTouched();

    const date = this.parseDate(this.value) ?? new Date();
    this.selectedYear = date.getFullYear();
    this.selectedMonth = date.getMonth();
    this.selectedDay = date.getDate();
    this.viewYear = this.selectedYear;
    this.viewMonth = this.selectedMonth;
    this.buildGrid();

    this.isOpen = true;
    this.isOpening = false;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    this.buildGrid();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    this.buildGrid();
  }

  selectDay(day: number): void {
    this.selectedDay = day;
    this.selectedMonth = this.viewMonth;
    this.selectedYear = this.viewYear;
  }

  isSelected(day: number): boolean {
    return day === this.selectedDay
      && this.viewMonth === this.selectedMonth
      && this.viewYear === this.selectedYear;
  }

  isToday(day: number): boolean {
    const today = new Date();
    return day === today.getDate()
      && this.viewMonth === today.getMonth()
      && this.viewYear === today.getFullYear();
  }

  done(): void {
    const m = String(this.selectedMonth + 1).padStart(2, '0');
    const d = String(this.selectedDay).padStart(2, '0');
    this.value = `${this.selectedYear}-${m}-${d}`;
    this.onChange(this.value);
    this.dateSelected.emit(this.value);
    this.close();
  }

  cancel(): void {
    this.close();
  }

  private close(): void {
    this.isOpen = false;
    setTimeout(() => { this.isOpening = false; }, 300);
  }

  private buildGrid(): void {
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const firstDow = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const offset = (firstDow + 6) % 7; // Mon-first
    this.cells = [];
    for (let i = 0; i < offset; i++) this.cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) this.cells.push(d);
  }

  private parseDate(s: string): Date | null {
    const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
}
