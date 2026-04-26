import { Component, ChangeDetectorRef, ElementRef, ViewChild, ViewEncapsulation, forwardRef, inject, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

const ITEM_HEIGHT = 48;
const HOURS_COUNT = 24;
const MINUTES_COUNT = 60;
// 5 copies: user starts in the middle (copy 3), has 2 full copies as buffer
// in each direction before hitting the edge
const REPEAT = 5;
const MIDDLE = Math.floor(REPEAT / 2); // = 2

@Component({
  selector: 'app-time-wheel',
  templateUrl: './time-wheel.component.html',
  styleUrls: ['./time-wheel.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeWheelComponent),
      multi: true,
    },
  ],
  imports: [IonItem, IonLabel, IonInput, IonButton, TranslateModule],
  encapsulation: ViewEncapsulation.None,
})
export class TimeWheelComponent implements ControlValueAccessor {
  @Input() label = '';

  @ViewChild('hourColumn') private hourColumnRef?: ElementRef<HTMLDivElement>;
  @ViewChild('minuteColumn') private minuteColumnRef?: ElementRef<HTMLDivElement>;

  private cdr = inject(ChangeDetectorRef);

  protected displayValue = '00:00';
  private hour = 0;
  private minute = 0;
  protected isDisabled = false;
  protected isOpen = false;
  private isOpening = false;

  protected readonly hours = Array.from({ length: HOURS_COUNT * REPEAT }, (_, i) => i % HOURS_COUNT);
  protected readonly minutes = Array.from({ length: MINUTES_COUNT * REPEAT }, (_, i) => i % MINUTES_COUNT);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    if (value) {
      this.displayValue = value;
      const parts = value.split(':');
      this.hour = parseInt(parts[0], 10) || 0;
      this.minute = parseInt(parts[1], 10) || 0;
    }
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }

  openPicker(): void {
    if (this.isDisabled || this.isOpen || this.isOpening) return;
    this.isOpening = true;
    this.onTouched();
    this.isOpen = true;

    // Force Angular to render the @if block now so ViewChild refs are available
    this.cdr.detectChanges();

    const hourEl = this.hourColumnRef!.nativeElement;
    const minEl = this.minuteColumnRef!.nativeElement;

    hourEl.style.scrollSnapType = 'none';
    minEl.style.scrollSnapType = 'none';
    hourEl.scrollTop = (MIDDLE * HOURS_COUNT + this.hour) * ITEM_HEIGHT;
    minEl.scrollTop = (MIDDLE * MINUTES_COUNT + this.minute) * ITEM_HEIGHT;
    requestAnimationFrame(() => {
      hourEl.style.scrollSnapType = '';
      minEl.style.scrollSnapType = '';
      this.attachNormalization(hourEl, HOURS_COUNT);
      this.attachNormalization(minEl, MINUTES_COUNT);
      this.isOpening = false;
    });
  }

  private attachNormalization(el: HTMLElement, count: number): void {
    let snapTimer: ReturnType<typeof setTimeout>;
    el.addEventListener('scroll', () => {
      // Immediate normalization when entering the edge copy (first or last):
      // this fires mid-scroll so the user never sees the boundary
      const idx = el.scrollTop / ITEM_HEIGHT;
      if (idx < count || idx >= (REPEAT - 1) * count) {
        this.normalizeColumn(el, count);
        return;
      }
      // After scroll settles, correct any sub-pixel snap drift
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => this.normalizeColumn(el, count), 150);
    });
  }

  private normalizeColumn(el: HTMLElement, count: number): void {
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const inEdge = index < count || index >= (REPEAT - 1) * count;
    if (inEdge) {
      const value = ((index % count) + count) % count;
      el.style.scrollSnapType = 'none';
      el.scrollTop = (MIDDLE * count + value) * ITEM_HEIGHT;
      requestAnimationFrame(() => { el.style.scrollSnapType = 'y mandatory'; });
    }
  }

  done(): void {
    const rawH = Math.round(this.hourColumnRef!.nativeElement.scrollTop / ITEM_HEIGHT);
    const rawM = Math.round(this.minuteColumnRef!.nativeElement.scrollTop / ITEM_HEIGHT);
    this.hour = rawH % HOURS_COUNT;
    this.minute = rawM % MINUTES_COUNT;
    this.displayValue = `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    this.onChange(this.displayValue);
    this.close();
  }

  cancel(): void {
    this.close();
  }

  private close(): void {
    this.isOpen = false;
    setTimeout(() => { this.isOpening = false; }, 300);
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
