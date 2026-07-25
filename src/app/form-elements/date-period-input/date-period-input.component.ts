import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, Input, OnInit, forwardRef, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TooltipService } from 'src/app/services/tooltip.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ControlValueAccessor, FormBuilder, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator, Validators } from '@angular/forms';
import { IonButton, IonChip, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';
import { DatePickerComponent } from 'src/app/form-elements/date-picker/date-picker.component';
import { addLocalDays, addLocalMonths, diffLocalDays, todayLocal } from 'src/app/functions/date';
import { DatePeriod } from 'src/app/types/date-period';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { dateRangeValidator } from 'src/app/validators/date-range.validator';
import { MAX_DATE_RANGE_DAYS, maxDateRangeValidator } from 'src/app/validators/max-date-range.validator';

export type PeriodName = 'week' | 'month';

@Component({
  selector: 'app-date-period-input',
  templateUrl: './date-period-input.component.html',
  styleUrls: ['./date-period-input.component.scss'],
  imports: [IonButton, IonChip, IonIcon, TranslateModule, FormsModule, ReactiveFormsModule, DatePickerComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePeriodInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: DatePeriodInputComponent
    },
  ],
})
export class DatePeriodInputComponent implements ControlValueAccessor, Validator, OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private tooltip = inject(TooltipService);
  private translate = inject(TranslateService);

  @Input() storageKey?: string;
  @Input() hideControls: boolean = false;
  @Input() defaultPeriod: PeriodName = 'week';
  @Input() minDate?: string;
  @Input() maxDate?: string;
  // Max allowed range length in days. null disables the limit (e.g. experiments).
  @Input() maxRangeDays: number | null = MAX_DATE_RANGE_DAYS;

  public form: ModelFormGroup<DatePeriod>;
  selectedPeriod: PeriodName | null = 'week';

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
    this.form = this.formBuilder.group(
      {
        startDate: ['', [Validators.required, dateFormatValidator]],
        endDate: ['', [Validators.required, dateFormatValidator]],
      },
      {
        validators: [dateRangeValidator]
      },
    );

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onUserInput());
  }

  ngOnInit() {
    if (this.maxRangeDays !== null) {
      this.form.addValidators(maxDateRangeValidator(this.maxRangeDays));
      this.form.updateValueAndValidity({ emitEvent: false });
    }
  }

  ngAfterViewInit() {
    this.selectedPeriod = this.defaultPeriod;

    if (this.storageKey) {
      const saved = localStorage.getItem(`${this.storageKey}-period-type`);
      if (saved === 'null') {
        this.selectedPeriod = null;
      } else if (saved) {
        this.selectedPeriod = saved as PeriodName;
      }
    }

    if (!this.form.value.startDate) {
      this.setDefaultDates();
    }
    this.cdr.detectChanges();
  }

  private onChange = (_: any) => { };
  private onTouched = () => { };

  writeValue(value: DatePeriod): void {
    if (value) {
      this.form.patchValue(value, { emitEvent: false });
    } else {
      this.form.patchValue({ startDate: '', endDate: '' }, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  shiftDates(shift: number) {
    const { startDate, endDate } = this.form.value;

    if (!startDate || !endDate) {
      return;
    }

    let newStartDate: string;
    let newEndDate: string;

    if (this.selectedPeriod === 'week') {
      newStartDate = addLocalDays(startDate, shift * 7);
      newEndDate = addLocalDays(endDate, shift * 7);
      if (this.minDate && newStartDate < this.minDate) {
        newStartDate = this.minDate;
        newEndDate = addLocalDays(this.minDate, 6);
      } else if (this.maxDate && newEndDate > this.maxDate) {
        newEndDate = this.maxDate;
        newStartDate = addLocalDays(this.maxDate, -6);
        if (this.minDate && newStartDate < this.minDate) newStartDate = this.minDate;
      }
    } else if (this.selectedPeriod === 'month') {
      newStartDate = addLocalMonths(startDate, shift);
      newEndDate = addLocalMonths(endDate, shift);
      if (this.minDate && newStartDate < this.minDate) {
        newStartDate = this.minDate;
        newEndDate = addLocalMonths(this.minDate, 1);
      } else if (this.maxDate && newEndDate > this.maxDate) {
        newEndDate = this.maxDate;
        newStartDate = addLocalMonths(this.maxDate, -1);
        if (this.minDate && newStartDate < this.minDate) newStartDate = this.minDate;
      }
    } else {
      const diffDays = diffLocalDays(startDate, endDate) + 1;
      newStartDate = addLocalDays(startDate, shift * diffDays);
      newEndDate = addLocalDays(endDate, shift * diffDays);
      if (this.minDate && newStartDate < this.minDate) {
        newStartDate = this.minDate;
        newEndDate = addLocalDays(this.minDate, diffDays - 1);
      } else if (this.maxDate && newEndDate > this.maxDate) {
        newEndDate = this.maxDate;
        newStartDate = addLocalDays(this.maxDate, -(diffDays - 1));
        if (this.minDate && newStartDate < this.minDate) newStartDate = this.minDate;
      }
    }

    this.patchAndUpdate({ startDate: newStartDate, endDate: newEndDate });
  }

  setDefaultDates() {
    if (this.selectedPeriod === null) {
      return;
    }

    const endDate = this.form.value.endDate || todayLocal();
    const startDate = this.selectedPeriod === 'week'
      ? addLocalDays(endDate, -6)
      : addLocalMonths(endDate, -1);

    this.patchAndUpdate({ startDate, endDate });
  }

  selectPeriod(period: PeriodName) {
    this.selectedPeriod = period;
    this.savePeriodType();
    this.setDefaultDates();
  }

  onUserInput() {
    this.selectedPeriod = null;
    this.savePeriodType();
    this.updateValue();
  }

  updateValue() {
    this.onChange(this.form.value);
    this.onTouched();
  }

  patchAndUpdate(value: DatePeriod) {
    const clamped = this.clamp(value);
    this.form.patchValue(clamped, { emitEvent: false });
    this.updateValue();
  }

  private clamp(value: DatePeriod): DatePeriod {
    let { startDate, endDate } = value;
    if (this.minDate) {
      if (startDate < this.minDate) startDate = this.minDate;
      if (endDate < this.minDate) endDate = this.minDate;
    }
    if (this.maxDate) {
      if (endDate > this.maxDate) endDate = this.maxDate;
      if (startDate > this.maxDate) startDate = this.maxDate;
    }
    return { startDate, endDate };
  }

  private savePeriodType() {
    if (this.storageKey) {
      localStorage.setItem(`${this.storageKey}-period-type`, String(this.selectedPeriod));
    }
  }

  showValidationError(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const errors = { ...this.form.errors };
    for (const ctrl of Object.values(this.form.controls)) {
      Object.assign(errors, ctrl.errors ?? {});
    }
    const messages = Object.entries(errors).map(([key, val]) => {
      if (key === 'required') return this.translate.instant('TK_VALUE_IS_REQUIRED');
      if (val?.message) return this.translate.instant(val.message, val.params);
      return key;
    });
    this.tooltip.show(event, messages.map(m => `- ${m}`).join('<br>'));
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.form.valid) {
      return Object.values(this.form.controls)
        .reduce((result, curr) => ({
          ...result,
          ...curr.errors,
        }), {});
    }

    return null;
  }
}
