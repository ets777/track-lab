export type WidgetType = 'action-button' | 'rules' | 'navigation' | 'metric-graph' | 'library-graph' | 'experiment';
export type ActionWidgetAction = 'new-activity' | 'new-action' | 'new-tag';
export type WidgetPeriod = '1w' | '2w' | '1m';

export const WIDGET_COLORS = [
  '#3880FF', '#2DD36F', '#EB445A', '#5260FF', '#FFC409', '#3DC2FF', '#FF6B35', '#9C27B0',
];

export interface ActionButtonWidgetConfig {
  type: 'action-button';
  action: ActionWidgetAction;
  color?: string;
}

export interface RulesWidgetConfig {
  type: 'rules';
}

export interface NavigationLink {
  route: string;
  label: string;
  icon: string;
}

export interface NavigationWidgetConfig {
  type: 'navigation';
  links: NavigationLink[];
}

export interface MetricGraphWidgetConfig {
  type: 'metric-graph';
  metricId: number;
  metricName: string;
  period: WidgetPeriod;
  color?: string;
}

export interface LibraryGraphWidgetConfig {
  type: 'library-graph';
  itemId: number;
  itemName: string;
  itemType: 'action' | 'tag' | 'item';
  period: WidgetPeriod;
  color?: string;
}

export interface ExperimentWidgetConfig {
  type: 'experiment';
  experimentId: number;
  experimentTitle: string;
}

export type WidgetConfig =
  | ActionButtonWidgetConfig
  | RulesWidgetConfig
  | NavigationWidgetConfig
  | MetricGraphWidgetConfig
  | LibraryGraphWidgetConfig
  | ExperimentWidgetConfig;

export interface DashboardWidget {
  id: string;
  config: WidgetConfig;
}

export function getWidgetHeight(config: WidgetConfig): 1 | 2 {
  if (config.type === 'action-button') return 1;
  if (config.type === 'rules') return 2;
  if (config.type === 'navigation') {
    return (config as NavigationWidgetConfig).links.length <= 4 ? 1 : 2;
  }
  return 2;
}

export function getNextColor(widgets: DashboardWidget[]): string {
  const used = new Set(
    widgets.map(w => {
      const c = w.config;
      if (c.type === 'action-button') return (c as ActionButtonWidgetConfig).color;
      if (c.type === 'metric-graph') return (c as MetricGraphWidgetConfig).color;
      if (c.type === 'library-graph') return (c as LibraryGraphWidgetConfig).color;
      return undefined;
    }).filter(Boolean)
  );
  return WIDGET_COLORS.find(c => !used.has(c)) ?? WIDGET_COLORS[0];
}

export const MAX_DASHBOARD_ROWS = 7;

export function getMaxDashboardRows(screenHeight: number): number {
  if (screenHeight < 700) return 5;
  if (screenHeight < 800) return 6;
  if (screenHeight < 900) return 7;
  return 8;
}

export interface NavigationLinkOption {
  route: string;
  label: string;
  icon: string;
}

export const AVAILABLE_NAV_LINKS: NavigationLinkOption[] = [
  { route: '/activity', label: 'TK_HISTORY', icon: 'time-outline' },
  { route: '/rule', label: 'TK_RULES', icon: 'shield-checkmark-outline' },
  { route: '/stats', label: 'TK_STATS', icon: 'bar-chart-outline' },
  { route: '/library', label: 'TK_LIBRARY', icon: 'library-outline' },
  { route: '/settings', label: 'TK_SETTINGS', icon: 'settings-outline' },
  { route: '/stats/achievements', label: 'TK_ACHIEVEMENTS', icon: 'trophy-outline' },
  { route: '/metric', label: 'TK_METRICS', icon: 'analytics-outline' },
  { route: '/experiment', label: 'TK_EXPERIMENTS', icon: 'flask-outline' },
  { route: '/actions', label: 'TK_ACTIONS', icon: 'list-outline' },
  { route: '/tag-list', label: 'TK_TAGS', icon: 'pricetag-outline' },
];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: 'default-action',
    config: { type: 'action-button', action: 'new-activity' },
  },
  {
    id: 'default-rules',
    config: { type: 'rules' },
  },
  {
    id: 'default-nav',
    config: {
      type: 'navigation',
      links: [
        { route: '/activity', label: 'TK_HISTORY', icon: 'time-outline' },
        { route: '/rule', label: 'TK_RULES', icon: 'shield-checkmark-outline' },
        { route: '/stats', label: 'TK_STATS', icon: 'bar-chart-outline' },
        { route: '/library', label: 'TK_LIBRARY', icon: 'library-outline' },
        { route: '/settings', label: 'TK_SETTINGS', icon: 'settings-outline' },
        { route: '/stats/achievements', label: 'TK_ACHIEVEMENTS', icon: 'trophy-outline' },
      ],
    },
  },
];
