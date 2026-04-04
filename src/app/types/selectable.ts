export type Selectable<T> = {
  num: number;
  title: string;
  subtitle?: string;
  item: T;
}

// CommonItem includes actions, tags and user items
export type CommonItem = {
  name: string;
  type: string;
  itemId: number;
};

export type ListRef = {
  name: string;
  listId: number;
}
