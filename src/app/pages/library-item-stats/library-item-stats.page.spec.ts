import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryItemStatsPage } from './library-item-stats.page';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('LibraryItemStatsPage', () => {
  let component: LibraryItemStatsPage;
  let fixture: ComponentFixture<LibraryItemStatsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), LibraryItemStatsPage],
      providers: [SQLiteService],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryItemStatsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
