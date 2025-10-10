import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DatePeriodInputComponent } from './date-period-input.component';
import { TranslateModule } from '@ngx-translate/core';

describe('DatePeriodInputComponent', () => {
  let component: DatePeriodInputComponent;
  let fixture: ComponentFixture<DatePeriodInputComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), DatePeriodInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DatePeriodInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
