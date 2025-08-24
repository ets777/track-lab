import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityListPage } from './activity-list.page';

describe('ActivityListPage', () => {
  let component: ActivityListPage;
  let fixture: ComponentFixture<ActivityListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
