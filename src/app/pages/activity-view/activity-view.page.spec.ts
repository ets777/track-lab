import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityViewPage } from './activity-view.page';

describe('ActivityViewPage', () => {
  let component: ActivityViewPage;
  let fixture: ComponentFixture<ActivityViewPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityViewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
