import { WithOptionalId } from "src/app/types/with-optional-id";

export interface ILibraryItemDb {
    id: number;
    name: string;
    libraryId: number;
}

export type ILibraryItemCreateDto = WithOptionalId<ILibraryItemDb>;

export interface ILibraryItem extends ILibraryItemDb {}
