import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IListDb {
    id: number;
    name: string;
    isBase?: boolean;
    isHidden?: boolean;
}

export type IListCreateDto = WithOptionalKeys<IListDb, 'id'>;

export interface IList extends IListDb {}
