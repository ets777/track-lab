import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActionListDb {
  id: number;
  actionId: number;
  listId: number;
}

export type IActionListCreateDto = WithOptionalKeys<IActionListDb, 'id'>;

export interface IActionList extends IActionListDb { }
