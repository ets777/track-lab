export type BaseMetricDefault = {
  names: string[];
  canonical: string;
  isBase: true;
  isHidden: false;
  step: number;
  minValue: number;
  maxValue: number;
  showPreviousValue: boolean;
};

export type BaseListDefault = {
  names: string[];
  canonical: string;
  isBase: true;
};

export const BASE_METRIC_DEFAULTS: BaseMetricDefault[] = [
  { names: ['TK_MOOD', 'Mood', 'Настроение'],     canonical: 'TK_MOOD',    isBase: true, isHidden: false, step: 1, minValue: 1, maxValue: 10, showPreviousValue: true },
  { names: ['TK_ENERGY', 'Energy', 'Энергия'],    canonical: 'TK_ENERGY',  isBase: true, isHidden: false, step: 1, minValue: 1, maxValue: 10, showPreviousValue: true },
  { names: ['TK_SATIETY', 'Satiety', 'Сытость'],  canonical: 'TK_SATIETY', isBase: true, isHidden: false, step: 1, minValue: 1, maxValue: 10, showPreviousValue: true },
];

export const BASE_LIST_DEFAULTS: BaseListDefault[] = [
  { names: ['TK_EMOTIONS', 'Emotions', 'Эмоции'], canonical: 'TK_EMOTIONS', isBase: true },
];

export const ALL_BASE_METRIC_NAMES = BASE_METRIC_DEFAULTS.flatMap(m => m.names);
export const ALL_BASE_LIST_NAMES = BASE_LIST_DEFAULTS.flatMap(l => l.names);
