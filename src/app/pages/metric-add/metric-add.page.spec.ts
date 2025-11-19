import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricAddPage } from './metric-add.page';

describe('MetricAddPage', () => {
  let component: MetricAddPage;
  let fixture: ComponentFixture<MetricAddPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MetricAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
