import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsPage } from './stats.page';
import { TranslateModule } from '@ngx-translate/core';

describe('StatsPage', () => {
  let component: StatsPage;
  let fixture: ComponentFixture<StatsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), StatsPage],
    }).compileComponents();
    
    fixture = TestBed.createComponent(StatsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
