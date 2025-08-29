import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityEditPage } from './activity-edit.page';

describe('ActivityEditPage', () => {
  let component: ActivityEditPage;
  let fixture: ComponentFixture<ActivityEditPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
