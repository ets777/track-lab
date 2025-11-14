import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IActionTagDb {
    id: number;
    actionId: number;
    tagId: number;
}

export type IActionTagCreateDto = WithOptionalKeys<IActionTagDb, 'id'>;

export interface IActionTag extends IActionTagDb {}
