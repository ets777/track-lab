import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonChip, IonInput, IonItem, IonLabel } from "@ionic/angular/standalone";
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { TranslateModule } from '@ngx-translate/core';
import { addDays, addMonths, format } from 'date-fns';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { dateRangeValidator } from 'src/app/validators/date-range.validator';
import { maxDateRangeValidator } from 'src/app/validators/max-date-range.validator';

type PeriodName = 'week' | 'month';
export type PeriodDates = {
  startDate: string;
  endDate: string;
};

@Component({
  selector: 'app-date-filter',
  templateUrl: './date-filter.component.html',
  styleUrls: ['./date-filter.component.scss'],
  imports: [IonLabel, IonItem, IonButton, IonInput, IonChip, MaskitoDirective, ValidationErrorDirective, FormsModule, ReactiveFormsModule, TranslateModule],
})
export class DateFilterComponent implements OnInit {
  @Output() selectedDates = new EventEmitter<PeriodDates>()

  filterForm: ModelFormGroup<PeriodDates>;
  selectedPeriod: PeriodName = 'week';

  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.filterForm = this.formBuilder.group(
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

  ngOnInit() {
    this.setDefaultDates();
  }

  setDefaultDates() {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    let startDate;

    if (this.selectedPeriod == 'week') {
      startDate = format(addDays(new Date(), -6), 'yyyy-MM-dd');
    } else {
      startDate = format(addMonths(new Date(), -1), 'yyyy-MM-dd');
    }

    this.filterForm.patchValue({ startDate, endDate });
    this.emitDates();
  }

  selectPeriod(period: PeriodName) {
    this.selectedPeriod = period;

    this.setDefaultDates();
  }

  shiftDates(shift: number) {
    const { startDate, endDate } = this.filterForm.value;
    let newStartDate;
    let newEndDate;

    if (!startDate || !endDate) {
      return;
    }

    if (this.selectedPeriod == 'week') {
      newStartDate = format(addDays(new Date(startDate), shift * 7), 'yyyy-MM-dd');
      newEndDate = format(addDays(new Date(endDate), shift * 7), 'yyyy-MM-dd');
    } else {
      newStartDate = format(addMonths(new Date(startDate), shift * 1), 'yyyy-MM-dd');
      newEndDate = format(addMonths(new Date(endDate), shift * 1), 'yyyy-MM-dd');
    }

    this.filterForm.patchValue({
      startDate: newStartDate,
      endDate: newEndDate,
    });

    this.emitDates();
  }

  emitDates() {
    const dates = this.filterForm.value as PeriodDates;
    if (!dates?.startDate || !dates?.endDate) {
      return;
    }
    this.selectedDates.emit(dates);
  }
}
