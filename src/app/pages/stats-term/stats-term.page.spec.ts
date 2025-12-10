import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsTermPage } from './stats-term.page';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('StatsTermPage', () => {
  let component: StatsTermPage;
  let fixture: ComponentFixture<StatsTermPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), StatsTermPage],
      providers: [SQLiteService],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsTermPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
