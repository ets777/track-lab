import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityAddPage } from './activity-add.page';

describe('ActivityAddPage', () => {
  let component: ActivityAddPage;
  let fixture: ComponentFixture<ActivityAddPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
