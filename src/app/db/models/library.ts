import { WithOptionalId } from "src/app/types/with-optional-id";

export interface ILibraryDb {
    id: number;
    name: string;
}

export type ILibraryCreateDto = WithOptionalId<ILibraryDb>;

export interface ILibrary extends ILibraryDb {}
