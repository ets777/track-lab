import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface ILibraryDb {
    id: number;
    name: string;
}

export type ILibraryCreateDto = WithOptionalKeys<ILibraryDb, 'id'>;

export interface ILibrary extends ILibraryDb {}
