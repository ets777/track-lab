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

export function getPartIndex(text: string, caretPosition: number, separator: string = ',') {
    const commaPositions = [
        ...findAllIndexes(text, separator),
        text.length,
    ];

    if (caretPosition >= text.length) {
        return commaPositions.length - 1;
    }

    for (let i = 0; i < commaPositions.length; i++) {
        if (commaPositions[i] >= caretPosition) {
            return i;
        }
    }

    return commaPositions.length - 1;
}

function findAllIndexes(text: string, subString: string) {
    let index = 0;
    let result: number[] = [];

    if (!text) {
        return result;
    }

    while (text.indexOf(subString, index + 1) >= 0) {
        index = text.indexOf(subString, index + 1);
        result.push(index);
    }

    return result;
}