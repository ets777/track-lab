import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DictionaryListPage } from './dictionary-list.page';
import { SQLiteService } from 'src/app/services/db/sqlite.service';
import { TranslateModule } from '@ngx-translate/core';

describe('DictionaryListPage', () => {
  let component: DictionaryListPage;
  let fixture: ComponentFixture<DictionaryListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), DictionaryListPage],
      providers: [SQLiteService],
    }).compileComponents();

    fixture = TestBed.createComponent(DictionaryListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
