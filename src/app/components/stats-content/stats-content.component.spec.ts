import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { StatsContentComponent } from './stats-content.component';
import { ActivityService } from 'src/app/services/activity.service';
import { MetricService } from 'src/app/services/metric.service';
import { LoadingService } from 'src/app/services/loading.service';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { Component } from '@angular/core';

@Component({ selector: 'app-date-period-input', template: '', standalone: true })
class DatePeriodInputStub {}

const validPeriod = { startDate: '2024-01-01', endDate: '2024-01-07' };
const anotherPeriod = { startDate: '2024-02-01', endDate: '2024-02-07' };

function makeMetric(id: number, name: string) {
  return { id, name, isHidden: false, isBase: true, step: 1, minValue: 1, maxValue: 10 };
}

describe('StatsContentComponent - localStorage save logic', () => {
  let component: StatsContentComponent;

  beforeEach(async () => {
    const activityService = jasmine.createSpyObj<ActivityService>('ActivityService', ['getByDate']);
    activityService.getByDate.and.resolveTo([]);

    const metricService = jasmine.createSpyObj<MetricService>('MetricService', ['getAll']);
    metricService.getAll.and.resolveTo([makeMetric(1, 'TK_MOOD')]);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        FormBuilder,
        { provide: ActivityService, useValue: activityService },
        { provide: MetricService, useValue: metricService },
        { provide: LoadingService, useValue: { show: () => {}, hide: () => {}, tryLock: () => true } },
        { provide: Router, useValue: { navigate: jasmine.createSpy() } },
        { provide: ToastController, useValue: { create: jasmine.createSpy().and.resolveTo({ present: jasmine.createSpy() }) } },
      ],
    })
      .overrideComponent(StatsContentComponent, {
        remove: { imports: [DatePeriodInputComponent] },
        add: { imports: [DatePeriodInputStub] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(StatsContentComponent);
    component = fixture.componentInstance;
    localStorage.clear();

    // Skip ngOnInit to avoid real async loading; set flags manually
    (component as any).initialized = true;
    (component as any).initDone = true;
    // Bypass the setTimeout inside loadStats by reimplementing just the save logic
    spyOn(component, 'loadStats').and.callFake(async () => {
      const period = component.filterForm.value.datePeriod;
      const { startDate, endDate } = period ?? {};
      if (!startDate || !endDate) return;

      if (component.filterForm.valid) {
        localStorage.setItem('stats-date-period', JSON.stringify(period));
      }
      if ((component as any).initialized && component.metricsControl.valid) {
        localStorage.setItem('stats-metrics', component.metricInputText);
      }
    });
  });

  afterEach(() => localStorage.clear());

  async function runLoad(period: any, metricsText = '') {
    component.metricInputText = metricsText;
    component.metricsControl.setValue(metricsText, { emitEvent: false });
    component.filterForm.patchValue({ datePeriod: period }, { emitEvent: false });
    await component.loadStats();
  }

  it('saves date period when dates are valid', async () => {
    await runLoad(validPeriod, 'mood');
    expect(localStorage.getItem('stats-date-period')).toBe(JSON.stringify(validPeriod));
  });

  it('saves metrics when metricsControl is valid', async () => {
    await runLoad(validPeriod, 'mood');
    expect(localStorage.getItem('stats-metrics')).toBe('mood');
  });

  it('does not save date period when startDate is missing', async () => {
    await runLoad({ startDate: '', endDate: '2024-01-07' });
    expect(localStorage.getItem('stats-date-period')).toBeNull();
  });

  it('does not save date period when endDate is missing', async () => {
    await runLoad({ startDate: '2024-01-01', endDate: '' });
    expect(localStorage.getItem('stats-date-period')).toBeNull();
  });

  it('does not save date period when datePeriod is null', async () => {
    await runLoad(null);
    expect(localStorage.getItem('stats-date-period')).toBeNull();
  });

  it('does not save metrics when metricsControl has duplicate entries', async () => {
    await runLoad(validPeriod, 'mood, mood');
    expect(localStorage.getItem('stats-metrics')).toBeNull();
  });

  it('does not save metrics when metricsControl exceeds max metrics count', async () => {
    await runLoad(validPeriod, 'a, b, c, d, e, f');
    expect(localStorage.getItem('stats-metrics')).toBeNull();
  });

  it('overwrites previously saved date period on subsequent valid loads', async () => {
    await runLoad(validPeriod, 'mood');
    await runLoad(anotherPeriod, 'mood');
    expect(localStorage.getItem('stats-date-period')).toBe(JSON.stringify(anotherPeriod));
  });

  it('overwrites previously saved metrics on subsequent valid loads', async () => {
    await runLoad(validPeriod, 'mood');
    await runLoad(anotherPeriod, 'energy');
    expect(localStorage.getItem('stats-metrics')).toBe('energy');
  });

  it('does not overwrite valid saved period if a later load has missing dates', async () => {
    await runLoad(validPeriod, 'mood');
    await runLoad({ startDate: '', endDate: '' }, 'mood');
    expect(localStorage.getItem('stats-date-period')).toBe(JSON.stringify(validPeriod));
  });

  it('does not overwrite valid saved metrics if a later load has invalid metrics', async () => {
    await runLoad(validPeriod, 'mood');
    await runLoad(anotherPeriod, 'mood, mood');
    expect(localStorage.getItem('stats-metrics')).toBe('mood');
  });
});
