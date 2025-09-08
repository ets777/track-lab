import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsPage } from './settings.page';
import { TranslateModule } from '@ngx-translate/core';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), SettingsPage],
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
