import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActionTagDb {
    id: number;
    actionId: number;
    tagId: number;
}

export type IActionTagCreateDto = WithOptionalId<IActionTagDb>;

export interface IActionTag extends IActionTagDb {}
