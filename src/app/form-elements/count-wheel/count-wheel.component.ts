import { Component, ChangeDetectorRef, ElementRef, Input, OnChanges, ViewChild, ViewEncapsulation, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonItem, IonLabel, IonButton, IonText } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

const ITEM_HEIGHT = 48;

@Component({
  selector: 'app-count-wheel',
  templateUrl: './count-wheel.component.html',
  styleUrls: ['./count-wheel.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CountWheelComponent),
      multi: true,
    },
  ],
  imports: [IonItem, IonLabel, IonButton, IonText, TranslateModule],
})
export class CountWheelComponent implements ControlValueAccessor, OnChanges {
  @Input() label = '';
  @Input() unitLabel = '';
  @Input() min = 1;
  @Input() max = 1000;

  @ViewChild('column') private columnRef?: ElementRef<HTMLDivElement>;

  private cdr = inject(ChangeDetectorRef);

  protected value = 1;
  protected items: number[] = [];
  protected isOpen = false;
  private isOpening = false;

  private onChange: (v: number) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(): void {
    this.items = Array.from({ length: this.max - this.min + 1 }, (_, i) => this.min + i);
  }

  writeValue(v: number | string): void {
    const n = Number(v);
    if (!isNaN(n)) this.value = n;
  }

  registerOnChange(fn: (v: number) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(): void {}

  openPicker(): void {
    if (this.isOpen || this.isOpening) return;
    this.isOpening = true;
    this.onTouched();
    this.isOpen = true;

    this.cdr.detectChanges();

    const el = this.columnRef!.nativeElement;
    el.style.scrollSnapType = 'none';
    el.scrollTop = (this.value - this.min) * ITEM_HEIGHT;
    requestAnimationFrame(() => {
      el.style.scrollSnapType = '';
      this.isOpening = false;
    });
  }

  done(): void {
    const el = this.columnRef!.nativeElement;
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    this.value = Math.min(this.max, Math.max(this.min, this.min + index));
    this.onChange(this.value);
    this.close();
  }

  cancel(): void {
    this.close();
  }

  private close(): void {
    this.isOpen = false;
    setTimeout(() => { this.isOpening = false; }, 300);
  }
}
