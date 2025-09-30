import { WithOptionalId } from "src/app/types/with-optional-id";

export interface ITagDb {
    id: number;
    name: string;
}

export type ITagCreateDto = WithOptionalId<ITagDb>;

export interface ITag extends ITagDb {}
