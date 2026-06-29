import { ChartConfiguration } from 'chart.js';

/**
 * Clinical design-system styling for dashboard/stats charts.
 * Values mirror the graph widgets in design/ (light grid, mono gray axis labels,
 * solid colours, rounded bars, line with point dots).
 */

export const CHART_GRID_COLOR = '#e7ebef';
export const CHART_TICK_COLOR = '#9aa6b4';
export const CHART_LEGEND_COLOR = '#475569';
export const CHART_FONT = { family: "'IBM Plex Mono', ui-monospace, monospace", size: 10 };

const legendPlugin = {
  legend: {
    display: true,
    position: 'top' as const,
    labels: {
      color: CHART_LEGEND_COLOR,
      font: CHART_FONT,
      boxWidth: 24,
      boxHeight: 12,
      useBorderRadius: true,
      borderRadius: 3,
      padding: 12,
    },
  },
};

const buildScales = (beginAtZero: boolean, yExtra: Record<string, unknown>) => ({
  x: {
    grid: { display: false },
    border: { color: CHART_GRID_COLOR },
    ticks: { color: CHART_TICK_COLOR, font: CHART_FONT },
  },
  y: {
    beginAtZero,
    grid: { color: CHART_GRID_COLOR },
    border: { display: false },
    ticks: { color: CHART_TICK_COLOR, font: CHART_FONT },
    ...yExtra,
  },
});

export interface StyledChartOptions {
  fillHeight?: boolean;
  yMin?: number;
  yMax?: number;
}

function buildOptions(beginAtZero: boolean, { fillHeight, yMin, yMax }: StyledChartOptions) {
  const yExtra: Record<string, unknown> = {};
  if (yMin !== undefined) yExtra['min'] = yMin;
  if (yMax !== undefined) yExtra['max'] = yMax;
  return {
    responsive: true,
    maintainAspectRatio: !fillHeight,
    plugins: legendPlugin,
    scales: buildScales(beginAtZero, yExtra),
  };
}

export function styledLineChartOptions(options: StyledChartOptions = {}): ChartConfiguration<'line'>['options'] {
  return buildOptions(false, options) as ChartConfiguration<'line'>['options'];
}

export function styledBarChartOptions(options: StyledChartOptions = {}): ChartConfiguration<'bar'>['options'] {
  return buildOptions(true, options) as ChartConfiguration<'bar'>['options'];
}

/** Line dataset shape: point dots, straight segments, no area fill. */
export const LINE_DATASET_STYLE = { borderWidth: 2, pointRadius: 2.6, pointHoverRadius: 4, tension: 0, fill: false };

/** Line dataset colours for a fixed chart colour. */
export function lineDatasetColor(color: string) {
  return { borderColor: color, backgroundColor: color, pointBackgroundColor: color, pointBorderColor: color };
}

/** Bar dataset shape: rounded corners, solid fill. */
export const BAR_DATASET_STYLE = { borderRadius: 3, borderSkipped: false as const };

/** Bar dataset colours for a fixed chart colour. */
export function barDatasetColor(color: string) {
  return { backgroundColor: color, borderColor: color };
}
