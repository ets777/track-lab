import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityEditPage } from './activity-edit.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('ActivityEditPage', () => {
  let component: ActivityEditPage;
  let fixture: ComponentFixture<ActivityEditPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), ActivityEditPage],
      providers: [provideRouter([]), SQLiteService],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
