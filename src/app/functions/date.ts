export function isDateValid(date: string) {
    const dateObject = new Date(date);
    const [y, m, d] = date.split('-').map(Number);

    return dateObject.getFullYear() === y
        && dateObject.getMonth() + 1 === m
        && dateObject.getDate() === d
}