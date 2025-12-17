import { CommonTerm } from "../types/selectable";

export function filterUniqueElements(array: CommonTerm[]) {
  return array.filter(
    (item, index, self) =>
      index === self.findIndex(
        (t) => t.name === item.name && t.type === item.type
      )
  );
}