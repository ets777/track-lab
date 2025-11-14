import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActionLibraryDb {
    id: number;
    actionId: number;
    libraryId: number;
}

export type IActionLibraryCreateDto = WithOptionalKeys<IActionLibraryDb, 'id'>;

export interface IActionLibrary extends IActionLibraryDb {}
