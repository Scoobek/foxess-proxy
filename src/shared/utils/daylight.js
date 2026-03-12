/**
 * Daylight utilities - funkcje pomocnicze do sprawdzania pory dnia
 */

import { getCurrentWarsawMinutes, parseTimeToMinutes } from "./time.js";

/**
 * Sprawdza czy aktualny czas Warsaw jest w zakresie sunrise-sunset
 * Zwraca: "before" | "daylight" | "after" | "unknown"
 */
export function getDaylightStatus(sunrise, sunset) {
    const sunriseMin = parseTimeToMinutes(sunrise);
    const sunsetMin = parseTimeToMinutes(sunset);
    const nowMin = getCurrentWarsawMinutes();

    if (sunriseMin === null || sunsetMin === null) {
        return "unknown";
    }

    if (nowMin < sunriseMin) return "before";
    if (nowMin > sunsetMin) return "after";
    return "daylight";
}
