import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagAddPage } from './tag-add.page';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

describe('TagAddPage', () => {
  let component: TagAddPage;
  let fixture: ComponentFixture<TagAddPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TagAddPage, IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TagAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
