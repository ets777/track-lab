import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricListPage } from './metric-list.page';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('MetricListPage', () => {
  let component: MetricListPage;
  let fixture: ComponentFixture<MetricListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MetricListPage],
      providers: [SQLiteService],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
