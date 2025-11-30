import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IDictionaryDb {
    id: number;
    name: string;
}

export type IDictionaryCreateDto = WithOptionalKeys<IDictionaryDb, 'id'>;

export interface IDictionary extends IDictionaryDb {}
