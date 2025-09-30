import { WithOptionalId } from "src/app/types/with-optional-id";
import { ITag } from "./tag";

export interface IActionDb {
    id: number;
    name: string;
}

export type IActionCreateDto = WithOptionalId<IActionDb>;

export interface IAction extends IActionDb {
    tags: ITag[];
}
