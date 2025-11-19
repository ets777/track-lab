import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricEditPage } from './metric-edit.page';

describe('MetricEditPage', () => {
  let component: MetricEditPage;
  let fixture: ComponentFixture<MetricEditPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MetricEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
