import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TooltipComponent } from './tooltip.component';

describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TooltipComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
