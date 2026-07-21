import { ChartConfiguration } from 'chart.js';

/**
 * Clinical design-system styling for dashboard/stats charts.
 * Values mirror the graph widgets in design/ (light grid, mono gray axis labels,
 * solid colours, rounded bars, line with point dots).
 */

export const CHART_FONT = { family: "'IBM Plex Mono', ui-monospace, monospace", size: 10 };

/** Read a CSS custom property off :root, with a fallback if unavailable. */
function cssVar(name: string, fallback: string): string {
  if (typeof getComputedStyle === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Theme-aware chart colours, resolved at build time so they track light/dark. */
export const chartGridColor = () => cssVar('--tl-chart-grid', '#dbe1e7');
export const chartTickColor = () => cssVar('--tl-text-faint', '#9aa6b4');
export const chartLegendColor = () => cssVar('--tl-text-dim', '#475569');

const legendPlugin = () => ({
  legend: {
    display: true,
    position: 'top' as const,
    labels: {
      color: chartLegendColor(),
      font: CHART_FONT,
      boxWidth: 24,
      boxHeight: 12,
      useBorderRadius: true,
      borderRadius: 3,
      padding: 12,
    },
  },
});

const buildScales = (beginAtZero: boolean, yExtra: Record<string, unknown>) => ({
  x: {
    grid: { display: false },
    border: { color: chartGridColor() },
    ticks: { color: chartTickColor(), font: CHART_FONT },
  },
  y: {
    beginAtZero,
    grid: { color: chartGridColor() },
    border: { display: false },
    ticks: { color: chartTickColor(), font: CHART_FONT },
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
    plugins: legendPlugin(),
    scales: buildScales(beginAtZero, yExtra),
  };
}

export function styledLineChartOptions(options: StyledChartOptions = {}): ChartConfiguration<'line'>['options'] {
  return buildOptions(false, options) as ChartConfiguration<'line'>['options'];
}

export function styledBarChartOptions(options: StyledChartOptions = {}): ChartConfiguration<'bar'>['options'] {
  return buildOptions(true, options) as ChartConfiguration<'bar'>['options'];
}

/**
 * Re-resolve theme-dependent grid/tick/legend colours on an existing chart's
 * options in place. Call after a light/dark switch, then chart.update().
 */
export function applyChartThemeColors(options: Record<string, any> | undefined): void {
  if (!options) return;
  const grid = chartGridColor();
  const tick = chartTickColor();
  const scales = options['scales'] ?? {};
  for (const axis of Object.values<any>(scales)) {
    if (!axis) continue;
    if (axis.grid) axis.grid.color = grid;
    if (axis.border) axis.border.color = grid;
    if (axis.ticks) axis.ticks.color = tick;
  }
  const legendLabels = options['plugins']?.legend?.labels;
  if (legendLabels) legendLabels.color = chartLegendColor();
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

/** Resolve the current theme accent colour from CSS custom properties. */
export function accentColor(): string {
  if (typeof getComputedStyle === 'undefined') return '#2563eb';
  return getComputedStyle(document.documentElement).getPropertyValue('--tl-accent').trim() || '#2563eb';
}
