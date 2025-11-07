import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityListPage } from './activity-list.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('ActivityListPage', () => {
  let component: ActivityListPage;
  let fixture: ComponentFixture<ActivityListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), ActivityListPage],
      providers: [provideRouter([]), SQLiteService],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
