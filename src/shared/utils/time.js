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
 * Formatuje minuty od północy jako HH:MM
 * @param {number} minutes - minuty od północy
 * @returns {string} czas w formacie "8:30"
 */
export function formatMinutesAsTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Oblicza milisekundy do podanego czasu (w minutach od północy)
 * @param {number} targetMinutes - docelowy czas w minutach od północy
 * @returns {number} milisekundy do celu (lub 0 jeśli już minął)
 */
export function msUntilMinutes(targetMinutes) {
    const nowMinutes = getCurrentWarsawMinutes();
    const diffMinutes = targetMinutes - nowMinutes;

    if (diffMinutes <= 0) return 0;
    return diffMinutes * 60 * 1000;
}

/**
 * Oblicza czas następnego poll jako ISO string
 * @param {number} intervalMs - interwał w milisekundach
 * @returns {string} ISO timestamp następnego poll
 */
export function calcNextPollAt(intervalMs) {
    return new Date(Date.now() + intervalMs).toISOString();
}
