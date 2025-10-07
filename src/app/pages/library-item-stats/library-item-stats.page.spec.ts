import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryItemStatsPage } from './library-item-stats.page';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

describe('LibraryItemStatsPage', () => {
  let component: LibraryItemStatsPage;
  let fixture: ComponentFixture<LibraryItemStatsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), LibraryItemStatsPage]
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryItemStatsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
