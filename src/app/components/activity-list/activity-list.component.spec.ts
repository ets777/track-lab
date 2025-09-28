import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActivityListComponent } from './activity-list.component';
import { TranslateModule } from '@ngx-translate/core';

describe('ActivityListComponent', () => {
  let component: ActivityListComponent;
  let fixture: ComponentFixture<ActivityListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ActivityListComponent, IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
