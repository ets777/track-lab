import { CommonItem } from "../types/selectable";

export function filterUniqueElements(array: CommonItem[]) {
  return array.filter(
    (item, index, self) =>
      index === self.findIndex(
        (t) => t.name === item.name && t.type === item.type
      )
  );
}