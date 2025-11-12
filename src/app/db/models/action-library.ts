import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActionLibraryDb {
    id: number;
    actionId: number;
    libraryId: number;
}

export type IActionLibraryCreateDto = WithOptionalId<IActionLibraryDb>;

export interface IActionLibrary extends IActionLibraryDb {}
