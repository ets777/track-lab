import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityCalendarPage } from './activity-calendar.page';
import { TranslateModule } from '@ngx-translate/core';

describe('ActivityCalendarPage', () => {
  let component: ActivityCalendarPage;
  let fixture: ComponentFixture<ActivityCalendarPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), ActivityCalendarPage],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
