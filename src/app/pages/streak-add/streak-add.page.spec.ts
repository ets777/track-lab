import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StreakAddPage } from './streak-add.page';

describe('StreakAddPage', () => {
  let component: StreakAddPage;
  let fixture: ComponentFixture<StreakAddPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StreakAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
