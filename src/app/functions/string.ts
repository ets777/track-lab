export function lowerCaseFirstLetter(str: string) {
    if (typeof str !== 'string' || str.length === 0) {
        return str;
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}