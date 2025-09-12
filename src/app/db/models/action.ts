export interface IActionDb {
    id: number;
    name: string;
}

export interface IAction extends IActionDb {}

export interface IActionCreateDto {
    name: string;
}
