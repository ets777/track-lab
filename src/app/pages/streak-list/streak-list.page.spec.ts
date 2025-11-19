import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StreakListPage } from './streak-list.page';

describe('StreakListPage', () => {
  let component: StreakListPage;
  let fixture: ComponentFixture<StreakListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StreakListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
