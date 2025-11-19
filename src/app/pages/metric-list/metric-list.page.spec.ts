import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricListPage } from './metric-list.page';

describe('MetricListPage', () => {
  let component: MetricListPage;
  let fixture: ComponentFixture<MetricListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MetricListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
