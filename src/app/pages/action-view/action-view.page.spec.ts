import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionViewPage } from './action-view.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('ActionViewPage', () => {
  let component: ActionViewPage;
  let fixture: ComponentFixture<ActionViewPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionViewPage, TranslateModule.forRoot()],
      providers: [provideRouter([]), SQLiteService],
    }).compileComponents();
    fixture = TestBed.createComponent(ActionViewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
