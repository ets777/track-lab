import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsMenuComponent } from './stats-menu.component';
import { TranslateModule } from '@ngx-translate/core';

describe('StatsMenuComponent', () => {
  let component: StatsMenuComponent;
  let fixture: ComponentFixture<StatsMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), StatsMenuComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
