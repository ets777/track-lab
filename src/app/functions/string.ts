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

export function entitiesToString(entities: WithName[]) {
    return entities.map((entity) => entity.name).join(', ');
}