import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityCalendarPage } from './activity-calendar.page';

describe('ActivityCalendarPage', () => {
  let component: ActivityCalendarPage;
  let fixture: ComponentFixture<ActivityCalendarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
