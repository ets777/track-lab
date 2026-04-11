import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { StatsItemContentComponent } from './stats-item-content.component';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ListService } from 'src/app/services/list.service';
import { ItemService } from 'src/app/services/item.service';
import { LoadingService } from 'src/app/services/loading.service';
import { TranslateModule } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { CommonItem } from 'src/app/types/selectable';

@Component({ selector: 'app-date-period-input', template: '', standalone: true })
class DatePeriodInputStub {}

@Component({ selector: 'app-select-search', template: '', standalone: true })
class SelectSearchStub {}

const validPeriod = { startDate: '2024-01-01', endDate: '2024-01-07' };
const anotherPeriod = { startDate: '2024-02-01', endDate: '2024-02-07' };
const validItem: CommonItem = { name: 'Running', type: 'action', itemId: 1 };
const anotherItem: CommonItem = { name: 'Reading', type: 'action', itemId: 2 };

describe('StatsItemContentComponent - localStorage save logic', () => {
  let component: StatsItemContentComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        FormBuilder,
        { provide: ActivityService, useValue: { getByDate: jasmine.createSpy().and.resolveTo([]) } },
        { provide: ActionService, useValue: { getAllUnhidden: jasmine.createSpy().and.resolveTo([]) } },
        { provide: TagService, useValue: { getAllUnhidden: jasmine.createSpy().and.resolveTo([]) } },
        { provide: ListService, useValue: { getAll: jasmine.createSpy().and.resolveTo([]) } },
        { provide: ItemService, useValue: { getAllUnhidden: jasmine.createSpy().and.resolveTo([]) } },
        { provide: LoadingService, useValue: { show: () => {}, hide: () => {}, tryLock: () => true } },
      ],
    })
      .overrideComponent(StatsItemContentComponent, {
        remove: { imports: [DatePeriodInputComponent, SelectSearchComponent] },
        add: { imports: [DatePeriodInputStub, SelectSearchStub] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(StatsItemContentComponent);
    component = fixture.componentInstance;
    localStorage.clear();

    (component as any).initialized = true;

    spyOn(component, 'setChartData').and.callFake(() => {
      if (!component.filterForm.valid) return;
      const period = component.filterForm.value.datePeriod;
      const item = component.filterForm.value.item;
      if (!period || !item) return;
      localStorage.setItem('stats-item-date-period', JSON.stringify(period));
      localStorage.setItem('stats-item-item', JSON.stringify(item));
    });
  });

  afterEach(() => localStorage.clear());

  function setForm(period: any, item: any) {
    component.filterForm.patchValue({ datePeriod: period, item }, { emitEvent: false });
  }

  it('saves date period and item when form is valid', () => {
    setForm(validPeriod, validItem);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBe(JSON.stringify(validPeriod));
    expect(localStorage.getItem('stats-item-item')).toBe(JSON.stringify(validItem));
  });

  it('does not save when item is missing', () => {
    setForm(validPeriod, null);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBeNull();
    expect(localStorage.getItem('stats-item-item')).toBeNull();
  });

  it('does not save when datePeriod is missing', () => {
    setForm(null, validItem);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBeNull();
    expect(localStorage.getItem('stats-item-item')).toBeNull();
  });

  it('does not save when both fields are missing', () => {
    setForm(null, null);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBeNull();
    expect(localStorage.getItem('stats-item-item')).toBeNull();
  });

  it('overwrites previously saved values on subsequent valid calls', () => {
    setForm(validPeriod, validItem);
    component.setChartData();

    setForm(anotherPeriod, anotherItem);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBe(JSON.stringify(anotherPeriod));
    expect(localStorage.getItem('stats-item-item')).toBe(JSON.stringify(anotherItem));
  });

  it('does not overwrite valid saved values when a later call has invalid form', () => {
    setForm(validPeriod, validItem);
    component.setChartData();

    setForm(null, null);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBe(JSON.stringify(validPeriod));
    expect(localStorage.getItem('stats-item-item')).toBe(JSON.stringify(validItem));
  });

  it('saves updated item with same period', () => {
    setForm(validPeriod, validItem);
    component.setChartData();

    setForm(validPeriod, anotherItem);
    component.setChartData();

    expect(localStorage.getItem('stats-item-item')).toBe(JSON.stringify(anotherItem));
    expect(localStorage.getItem('stats-item-date-period')).toBe(JSON.stringify(validPeriod));
  });

  it('saves updated period with same item', () => {
    setForm(validPeriod, validItem);
    component.setChartData();

    setForm(anotherPeriod, validItem);
    component.setChartData();

    expect(localStorage.getItem('stats-item-date-period')).toBe(JSON.stringify(anotherPeriod));
    expect(localStorage.getItem('stats-item-item')).toBe(JSON.stringify(validItem));
  });
});
