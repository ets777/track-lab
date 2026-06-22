export type WidgetType = 'action-button' | 'rules' | 'navigation' | 'metric-graph' | 'library-graph' | 'experiment';
export type ActionWidgetAction = 'new-activity' | 'new-action' | 'new-tag';
export type WidgetPeriod = '1w' | '2w' | '1m';

export const WIDGET_COLORS = [
  '#3880FF', '#2DD36F', '#EB445A', '#FFC409', '#3DC2FF', '#FF6B35', '#9C27B0',
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

export function experimentLinesToHeight(lineCount: number): 1 | 2 | 3 | 4 {
  if (lineCount >= 5) return 4;
  if (lineCount >= 2) return 3;
  return 2;
}

export function getWidgetHeight(config: WidgetConfig, ruleCount?: number, experimentLineCount?: number): 1 | 2 | 3 | 4 {
  if (config.type === 'action-button') return 1;
  if (config.type === 'rules') {
    const n = ruleCount ?? 4;
    return n <= 1 ? 2 : n === 2 ? 3 : 4;
  }
  if (config.type === 'navigation') {
    const n = (config as NavigationWidgetConfig).links.length;
    return n <= 3 ? 2 : 4;
  }
  if (config.type === 'experiment') {
    return experimentLinesToHeight(experimentLineCount ?? 6);
  }
  return 4;
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

export const MAX_DASHBOARD_ROWS = 12;

export function getMaxDashboardRows(screenHeight: number): number {
  if (screenHeight < 500) return 5;
  if (screenHeight < 575) return 6;
  if (screenHeight < 650) return 7;
  if (screenHeight < 725) return 8;
  if (screenHeight < 800) return 9;
  if (screenHeight < 875) return 10;
  if (screenHeight < 950) return 11;
  return 12;
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
        { route: '/experiment', label: 'TK_EXPERIMENTS', icon: 'flask-outline' },
        { route: '/library', label: 'TK_LIBRARY', icon: 'library-outline' },
        { route: '/metric', label: 'TK_METRICS', icon: 'analytics-outline' },
        { route: '/stats/achievements', label: 'TK_ACHIEVEMENTS', icon: 'trophy-outline' },
      ],
    },
  },
  {
    id: 'default-action',
    config: { type: 'action-button', action: 'new-activity', color: '#3880FF' },
  },
];
