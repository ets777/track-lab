import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivityFormComponent } from './activity-form.component';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('ActivityFormComponent', () => {
  let component: ActivityFormComponent;
  let fixture: ComponentFixture<ActivityFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), ReactiveFormsModule, FormsModule, ActivityFormComponent],
      providers: [SQLiteService],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form', () => {
    expect(component.activityForm).toBeDefined();
    expect(component.activityForm.contains('actions')).toBeTrue();
    expect(component.activityForm.contains('startTime')).toBeTrue();
    expect(component.activityForm.contains('endTime')).toBeTrue();
    expect(component.activityForm.contains('date')).toBeTrue();
    expect(component.activityForm.contains('mood')).toBeTrue();
    expect(component.activityForm.contains('energy')).toBeTrue();
    expect(component.activityForm.contains('satiety')).toBeTrue();
    expect(component.activityForm.contains('emotions')).toBeTrue();
    expect(component.activityForm.contains('tags')).toBeTrue();
  });

  it('should be invalid when required fields are empty', () => {
    component.activityForm.setValue({
      actions: '',
      startTime: '',
      endTime: '',
      comment: '',
      date: '',
      doNotMeasure: false,
      mood: 5,
      energy: 5,
      satiety: 5,
      emotions: '',
      tags: '',
    });
    expect(component.activityForm.invalid).toBeTrue();
  });

  it('should be valid when required fields are filled', () => {
    component.activityForm.setValue({
      actions: 'Test Activity',
      startTime: '12:00',
      endTime: '12:30',
      comment: 'Test comment',
      date: '2025-09-08',
      doNotMeasure: false,
      mood: 7,
      energy: 8,
      satiety: 6,
      emotions: 'happy',
      tags: 'tag1, tag2',
    });
    expect(component.activityForm.valid).toBeTrue();
  });
});
