import { Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { applyChartThemeColors } from 'src/app/functions/chart';

/**
 * Keeps a chart's grid/tick/legend colours in sync with the OS light/dark
 * theme without a page refresh. Chart options resolve their colours once at
 * build time, so a live `prefers-color-scheme` switch leaves stale colours
 * until re-applied. Applied automatically to any `canvas[baseChart]`.
 */
@Directive({
  selector: 'canvas[baseChart]',
  standalone: true,
})
export class ChartThemeDirective implements OnInit, OnDestroy {
  private readonly baseChart = inject(BaseChartDirective);
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly onThemeChange = () => this.apply();

  ngOnInit(): void {
    this.mediaQuery.addEventListener('change', this.onThemeChange);
  }

  ngOnDestroy(): void {
    this.mediaQuery.removeEventListener('change', this.onThemeChange);
  }

  private apply(): void {
    const chart = this.baseChart.chart;
    if (!chart) return;
    applyChartThemeColors(chart.options as Record<string, any>);
    chart.update('none');
  }
}
