import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryPage } from './library.page';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('LibraryPage', () => {
  let component: LibraryPage;
  let fixture: ComponentFixture<LibraryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryPage, TranslateModule.forRoot()],
      providers: [SQLiteService],
    }).compileComponents();
    fixture = TestBed.createComponent(LibraryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
