import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { Selectable, SelectSearchComponent } from "src/app/form-elements/select-search/select-search.component";
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { DatePeriod } from 'src/app/types/date-period';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';

type LibraryItem = {
  name: string;
  type: ('action' | 'tag');
};

export type FilterForm = {
  libraryItem: LibraryItem;
  datePeriod: DatePeriod;
};

@Component({
  selector: 'app-library-item-stats',
  templateUrl: './library-item-stats.page.html',
  styleUrls: ['./library-item-stats.page.scss'],
  standalone: true,
  imports: [IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, TranslateModule, SelectSearchComponent, ValidationErrorDirective, ReactiveFormsModule, DatePeriodInputComponent],
})
export class LibraryItemStatsPage implements OnInit {
  public libraryItems: LibraryItem[] = [];
  public filterForm: FormGroup;
  public suggestions: Selectable<LibraryItem>[] = [];

  constructor(
    private activityService: ActivityService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
  ) {
    this.filterForm = this.formBuilder.group({
      datePeriod: [],
      libraryItem: [null],
    });

    this.filterForm.get('datePeriod')?.valueChanges.subscribe(async () => {
      if (this.filterForm.controls['datePeriod'].valid) {
        await this.loadStats(this.filterForm.controls['datePeriod'].value);
      }
    });
  }

  ngOnInit() {
  }

  async loadStats(period: DatePeriod) {
    const { startDate, endDate } = period;

    if (!startDate || !endDate) {
      return;
    }

    const activities = await this.activityService.getByDate(startDate, endDate);

    const actions = activities
      .flatMap((activity) => activity.actions)
      .map((action) => ({
        name: action.name,
        type: 'action',
      } as LibraryItem));

    const activityTags = activities
      .flatMap((activity) => activity.tags)
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
      } as LibraryItem));
      
    const actionTags = activities
      .flatMap((activity) => activity.actions)
      .flatMap((action) => action.tags)
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
      } as LibraryItem));

    this.libraryItems = this.filterUniqueElements([
      ...actions,
      ...activityTags,
      ...actionTags,
    ]);

    this.setSuggestions();
    this.filterForm.get('libraryItem')?.updateValueAndValidity();
  }

  filterUniqueElements(array: LibraryItem[]) {
    return array.filter(
      (item, index, self) =>
        index === self.findIndex(
          (t) => t.name === item.name && t.type === item.type
        )
    );
  }

  setSuggestions() {
    this.suggestions = this.libraryItems.map((item, index) => ({
      num: index,
      title: item.name,
      subtitle: this.translate.instant('TK_' + item.type.toUpperCase()),
      item,
    }));
  }
}
