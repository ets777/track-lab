import { AfterViewInit, ChangeDetectorRef, Component, Input, forwardRef, inject } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormBuilder, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonButton, IonChip } from "@ionic/angular/standalone";
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { TranslateModule } from '@ngx-translate/core';
import { addDays, addMonths, format } from 'date-fns';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { DatePeriod } from 'src/app/types/date-period';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { dateRangeValidator } from 'src/app/validators/date-range.validator';
import { maxDateRangeValidator } from 'src/app/validators/max-date-range.validator';

export type PeriodName = 'week' | '2weeks' | 'month';

@Component({
  selector: 'app-date-period-input',
  templateUrl: './date-period-input.component.html',
  styleUrls: ['./date-period-input.component.scss'],
  imports: [IonItem, IonLabel, TranslateModule, IonInput, IonButton, IonChip, MaskitoDirective, FormsModule, ReactiveFormsModule, ValidationErrorDirective],
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
export class DatePeriodInputComponent implements ControlValueAccessor, Validator, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  @Input() storageKey?: string;

  public form: ModelFormGroup<DatePeriod>;
  selectedPeriod: PeriodName | null = 'week';

  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();

  constructor() {
    this.form = this.formBuilder.group(
      {
        startDate: ['', [Validators.required, dateFormatValidator]],
        endDate: ['', [Validators.required, dateFormatValidator]],
      },
      {
        validators: [
          dateRangeValidator,
          maxDateRangeValidator(31),
        ]
      },
    );
  }

  ngAfterViewInit() {
    if (this.storageKey) {
      const saved = localStorage.getItem(`${this.storageKey}-period-type`);
      if (saved === 'null') {
        this.selectedPeriod = null;
      } else if (saved) {
        this.selectedPeriod = saved as PeriodName;
      }
    }

    this.setDefaultDates();
    this.cdr.detectChanges();
  }

  private onChange = (_: any) => { };
  private onTouched = () => { };

  writeValue(value: DatePeriod): void {
    if (value) {
      this.form.patchValue(value);
    } else {
      this.form.patchValue({ startDate: '', endDate: '' });
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
      newStartDate = format(addDays(new Date(startDate), shift * 7), 'yyyy-MM-dd');
      newEndDate = format(addDays(new Date(endDate), shift * 7), 'yyyy-MM-dd');
    } else if (this.selectedPeriod === '2weeks') {
      newStartDate = format(addDays(new Date(startDate), shift * 14), 'yyyy-MM-dd');
      newEndDate = format(addDays(new Date(endDate), shift * 14), 'yyyy-MM-dd');
    } else if (this.selectedPeriod === 'month') {
      newStartDate = format(addMonths(new Date(startDate), shift), 'yyyy-MM-dd');
      newEndDate = format(addMonths(new Date(endDate), shift), 'yyyy-MM-dd');
    } else {
      const diffDays = Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
      ) + 1;
      newStartDate = format(addDays(new Date(startDate), shift * diffDays), 'yyyy-MM-dd');
      newEndDate = format(addDays(new Date(endDate), shift * diffDays), 'yyyy-MM-dd');
    }

    this.patchAndUpdate({ startDate: newStartDate, endDate: newEndDate });
  }

  setDefaultDates() {
    if (this.selectedPeriod === null) {
      return;
    }

    const endDate = this.form.value.endDate || format(new Date(), 'yyyy-MM-dd');
    let startDate: string;

    if (this.selectedPeriod === 'week') {
      startDate = format(addDays(new Date(endDate), -6), 'yyyy-MM-dd');
    } else if (this.selectedPeriod === '2weeks') {
      startDate = format(addDays(new Date(endDate), -13), 'yyyy-MM-dd');
    } else {
      startDate = format(addMonths(new Date(endDate), -1), 'yyyy-MM-dd');
    }

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
    this.form.patchValue(value);
    this.updateValue();
  }

  private savePeriodType() {
    if (this.storageKey) {
      localStorage.setItem(`${this.storageKey}-period-type`, String(this.selectedPeriod));
    }
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
