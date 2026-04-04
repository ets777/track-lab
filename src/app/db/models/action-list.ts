import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActionDictionaryDb {
  id: number;
  actionId: number;
  dictionaryId: number;
}

export type IActionDictionaryCreateDto = WithOptionalKeys<IActionDictionaryDb, 'id'>;

export interface IActionDictionary extends IActionDictionaryDb { }
