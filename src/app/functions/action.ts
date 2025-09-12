import { IAction, IActionCreateDto } from "../db/models/action";

export function getActionsFromString(actions: string) {
    return actions.split(',')
        .map((action: string) => action.trim())
        .filter(Boolean)
        .map((action: string) => ({ name: action } as IActionCreateDto));
}

export function actionsToString(actions: IAction[]) {
    return actions.map((action) => action.name).join(', ');
}