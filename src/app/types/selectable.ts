export type Selectable<T> = {
  num: number;
  title: string;
  subtitle?: string;
  item: T;
}

export type Term = {
  name: string;
  type: ('action' | 'tag' | 'custom');
  termId: number;
};