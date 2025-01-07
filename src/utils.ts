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

export { timeIntToString, dateIntToDate };