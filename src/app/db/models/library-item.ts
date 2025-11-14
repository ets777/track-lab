import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ILibraryItemDb {
    id: number;
    name: string;
    libraryId: number;
    isHidden: boolean;
}

export type ILibraryItemCreateDto = WithOptionalKeys<ILibraryItemDb, 'id' | 'isHidden'>;

export interface ILibraryItem extends ILibraryItemDb {}
