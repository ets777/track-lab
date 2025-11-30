import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LabMenuComponent } from './lab-menu.component';
import { TranslateModule } from '@ngx-translate/core';

describe('StatsMenuComponent', () => {
  let component: LabMenuComponent;
  let fixture: ComponentFixture<LabMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), LabMenuComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LabMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
