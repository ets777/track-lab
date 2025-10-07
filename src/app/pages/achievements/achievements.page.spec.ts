import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AchievementsPage } from './achievements.page';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

describe('AchievementsPage', () => {
  let component: AchievementsPage;
  let fixture: ComponentFixture<AchievementsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), AchievementsPage]
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
