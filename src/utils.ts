import * as dotenv from 'dotenv';

dotenv.config({ path: '.env'});

function dateIntToDate(date: number, time: number): Date {
    const dateString = date.toString();
    const timeString = time.toString().padStart(4, "0"); // Pad to ensure 4 digits    
    return new Date(
        parseInt(dateString.slice(0, 4)), // Year
        parseInt(dateString.slice(4, 6)) - 1, // Month (0-indexed)
        parseInt(dateString.slice(6, 8)), // Day
        parseInt(timeString.slice(0, 2)), // Hours
        parseInt(timeString.slice(2, 4)) // Minutes
    );
}

function timeIntToString(time: number): string {
    const timeString = time.toString();
    return `${timeString.slice(0, timeString.length - 2)}:${timeString.slice(timeString.length - 2)}`;
}

function toGMT(date: Date): Date {
    // The `WebUntis.convertUntisTime` method already returns a JS Date representing
    // the correct local wall-clock time for the event. Manually adjusting that
    // Date with a fixed or environment-provided offset is error-prone across DST
    // transitions. To keep times accurate, return a copy of the original Date
    // unchanged.
    return new Date(date.getTime());
}

export { timeIntToString, dateIntToDate, toGMT };