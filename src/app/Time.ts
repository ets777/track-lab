/**
 * A class for handling and manipulating time.
 *
 * Supports initialization with string-based time or numeric values.
 *
 * Usage examples:
 *
 * // Initialize with a time string in "HH:mm:ss" or "HH:mm" format
 * const time1 = new Time('12:00:00');
 * const time2 = new Time('12:00');
 *
 * // Initialize with individual hour, minute, and optional second values
 * const time3 = new Time(12, 0, 0);
 * const time4 = new Time(12, 0); // seconds default to 0
 *
 * // Initialize with the total number of seconds since midnight
 * const time5 = new Time(43200); // equivalent to 12:00:00
 *
 * // All examples above represent the same time (12:00 PM).
 */
export class Time {
    private totalSeconds: number;
    private static SECONDS_IN_DAY = 24 * 60 * 60;

    private normalizeSeconds(seconds: number): number {
        seconds = seconds % Time.SECONDS_IN_DAY;
        if (seconds < 0) {
            seconds += Time.SECONDS_IN_DAY;
        }
        return seconds;
    }

    constructor();
    constructor(time?: string);
    constructor(totalSeconds?: number);
    constructor(hours?: number, minutes?: number, seconds?: number);

    constructor(timeOrHoursOrTotalSeconds?: string | number, minutes?: number, seconds?: number) {
        let hour = 0;
        let minute = 0;
        let second = 0;

        if (typeof timeOrHoursOrTotalSeconds == 'string') {
            [hour, minute, second] = timeOrHoursOrTotalSeconds.split(':').map(Number);
            second = second ?? 0;
            this.checkTimeFormat(hour, minute, second);
            this.totalSeconds = this.normalizeSeconds(hour * 3600 + minute * 60 + second);
        } else if (
            typeof timeOrHoursOrTotalSeconds == 'number'
            && typeof minutes == 'number'
        ) {
            [hour, minute, second] = [timeOrHoursOrTotalSeconds, minutes, (seconds ?? 0)];
            this.checkTimeFormat(hour, minute, second);
            this.totalSeconds = this.normalizeSeconds(hour * 3600 + minute * 60 + second);
        } else if (
            typeof timeOrHoursOrTotalSeconds == 'number'
            && typeof minutes == 'undefined'
            && typeof seconds == 'undefined'
        ) {
            this.totalSeconds = this.normalizeSeconds(timeOrHoursOrTotalSeconds);
        } else {
            const date = new Date();
            [hour, minute, second] = [date.getHours(), date.getMinutes(), date.getSeconds()];
            this.checkTimeFormat(hour, minute, second);
            this.totalSeconds = this.normalizeSeconds(hour * 3600 + minute * 60 + second);
        }
    }

    valueOf(): number {
        return this.totalSeconds;
    }

    toString(full: boolean = true): string {
        const hours = Math.floor(this.totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((this.totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (this.totalSeconds % 60).toString().padStart(2, '0');

        if (full) {
            return `${hours}:${minutes}:${seconds}`;
        } else {
            return `${hours}:${minutes}`;
        }
    }

    addMinutes(minutes: number): Time {
        return new Time(this.normalizeSeconds(this.totalSeconds + minutes * 60));
    }

    checkTimeFormat(hour: number, minute: number, second: number): void {       
        if (
            !hour && hour != 0
            || !minute && minute != 0
            || !second && second != 0
            || minute < 0 
            || minute > 59
            || second < 0 
            || second > 59
            || hour < 0 
            || hour > 23
        ) {
            throw 'Wrong format of time';
        }
    }

    getHour() {
        return ~~(this.totalSeconds / 60 / 60);
    }

    getMinute() {
        return ~~(this.totalSeconds / 60);
    }

    getSecond() {
        return this.totalSeconds;
    }

    static isValid(time: string) {
        const [hour, minute, second] = time.split(':').map(Number);

        return (hour || hour === 0)
            && (minute || minute === 0)
            && (second >= 0 && second <= 59 || !second)
            && minute >= 0 && minute <= 59
            && hour >= 0 && hour <= 23;
    }
}