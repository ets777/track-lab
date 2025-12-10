import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ITermDb {
    id: number;
    name: string;
    dictionaryId: number;
    isHidden: boolean;
}

export type ITermCreateDto = WithOptionalKeys<ITermDb, 'id' | 'isHidden'>;

export interface ITerm extends ITermDb {}
