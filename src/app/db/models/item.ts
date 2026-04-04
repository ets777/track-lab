import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IItemDb {
    id: number;
    name: string;
    listId: number;
    isHidden: boolean;
}

export type IItemCreateDto = WithOptionalKeys<IItemDb, 'id' | 'isHidden'>;

export interface IItem extends IItemDb {}
