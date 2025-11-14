import { WithOptionalKeys } from "src/app/types/with-optional-keys";
import { ITag } from "./tag";

export interface IActionDb {
    id: number;
    name: string;
    isHidden: boolean;
}

export type IActionCreateDto = WithOptionalKeys<IActionDb, 'id' | 'isHidden'>;

export interface IAction extends IActionDb {
    tags: ITag[];
}
