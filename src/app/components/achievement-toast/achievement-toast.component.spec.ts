import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AchievementToastComponent } from './achievement-toast.component';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';

describe('AchievementToastComponent', () => {
  let component: AchievementToastComponent;
  let fixture: ComponentFixture<AchievementToastComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), AchievementToastComponent],
      providers: [SQLiteService],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
