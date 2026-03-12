/**
 * Time utilities - funkcje pomocnicze do operacji na czasie
 */

/**
 * Parsuje czas z formatu "6:07:43 AM" na minuty od północy
 */
export function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;

    const match = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[4].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

/**
 * Pobiera aktualny czas Warsaw w minutach od północy
 */
export function getCurrentWarsawMinutes() {
    const now = new Date();
    const warsawTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
    );
    return warsawTime.getHours() * 60 + warsawTime.getMinutes();
}

/**
 * Konwertuje minuty od północy na wyrażenie cron (minuty godzina * * *)
 * @param {number} totalMinutes - minuty od północy
 * @returns {string|null} wyrażenie cron lub null jeśli nieprawidłowe
 */
export function minutesToCronExpression(totalMinutes) {
    if (totalMinutes === null || totalMinutes < 0 || totalMinutes >= 1440) {
        return null;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${minutes} ${hours} * * *`;
}
