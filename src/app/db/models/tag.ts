import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ITagDb {
    id: number;
    name: string;
    isHidden: boolean;
}

export type ITagCreateDto = WithOptionalKeys<ITagDb, 'id' | 'isHidden'>;

export interface ITag extends ITagDb {}
