export type Selectable<T> = {
  num: number;
  title: string;
  subtitle?: string;
  item: T;
}

// CommonTerm includes actions, tags and user terms
export type CommonTerm = {
  name: string;
  type: string;
  termId: number;
};