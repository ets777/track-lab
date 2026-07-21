export function formatDisplayDate(dateStr: string, lang: string): string {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dateStr;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    const options: Intl.DateTimeFormatOptions = d.getFullYear() === new Date().getFullYear()
        ? { month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };
    return normalizeShortDate(d.toLocaleDateString(lang, options));
}

function normalizeShortDate(s: string): string {
    return s.replace(/\.(?=\s|$)/g, '');
}

export function formatWeekday(dateStr: string, lang: string): string {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return normalizeShortDate(d.toLocaleDateString(lang, { weekday: 'short' }));
}

export function formatGraphDate(dateStr: string, lang: string): string {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dateStr;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
}

export function isDateValid(date: string) {
    const dateObject = new Date(date);
    const [y, m, d] = date.split('-').map(Number);

    return dateObject.getFullYear() === y
        && dateObject.getMonth() + 1 === m
        && dateObject.getDate() === d
}