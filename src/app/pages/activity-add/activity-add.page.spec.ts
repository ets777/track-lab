import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityAddPage } from './activity-add.page';
import { TranslateModule } from '@ngx-translate/core';

describe('ActivityAddPage', () => {
  let component: ActivityAddPage;
  let fixture: ComponentFixture<ActivityAddPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), ActivityAddPage],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
