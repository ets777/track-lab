import { WithOptionalId } from "src/app/types/with-optional-id";

export interface IActionDb {
    id: number;
    name: string;
}

export type IActionCreateDto = WithOptionalId<IActionDb>;

export interface IAction extends IActionDb {}
