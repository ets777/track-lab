import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityListPage } from './activity-list.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';

describe('ActivityListPage', () => {
  let component: ActivityListPage;
  let fixture: ComponentFixture<ActivityListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), ActivityListPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
