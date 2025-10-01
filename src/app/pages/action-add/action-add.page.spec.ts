import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionAddPage } from './action-add.page';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

describe('ActionAddPage', () => {
  let component: ActionAddPage;
  let fixture: ComponentFixture<ActionAddPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActionAddPage, IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
