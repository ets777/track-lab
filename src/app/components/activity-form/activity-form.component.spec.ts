import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityFormComponent } from './activity-form.component';

describe('ActivityFormPage', () => {
  let component: ActivityFormComponent;
  let fixture: ComponentFixture<ActivityFormComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
