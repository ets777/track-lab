import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SelectSearchComponent } from './select-search.component';
import { TranslateModule } from '@ngx-translate/core';

describe('SelectSearchComponent', () => {
  let component: SelectSearchComponent;
  let fixture: ComponentFixture<SelectSearchComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), SelectSearchComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
