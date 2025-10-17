import { TranslateService } from "@ngx-translate/core";

export function lowerCaseFirstLetter(str: string) {
    if (typeof str !== 'string' || str.length === 0) {
        return str;
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}

type WithName = {
    name: string;
} & Record<string, any>;

export function getEntitiesFromString(
    entities: string
): { name: string }[] {
    return entities
        .split(',')
        .map((entity) => entity.trim())
        .filter((entity): entity is string => entity.length > 0)
        .map((entity) => ({ name: entity }));
}

export function entitiesToString(entities: WithName[], separator: string = ', ') {
    return entities.map((entity) => entity.name).join(separator);
}

export function getTimeString(translate: TranslateService, minutes: number) {
    const minuteUnit = translate.instant('TK_M').toLowerCase();
    const hourUnit = translate.instant('TK_H').toLowerCase();

    if (minutes < 60) {
        return `${Math.round(minutes)} ${minuteUnit}.`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainder = Math.floor(minutes % 60);

        return `${hours} ${hourUnit}. ${remainder} ${minuteUnit}.`;
    }
}