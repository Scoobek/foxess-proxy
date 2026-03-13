/**
 * Sunrise/Sunset Service - pobieranie czasów wschodu i zachodu słońca
 */

import {
    LOCATION_LAT,
    LOCATION_LNG,
    SUNRISE_SUNSET_API,
} from "../../config/sunrisesunset.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("sunService");

export async function fetchSunriseSunset() {
    const url = `${SUNRISE_SUNSET_API}?lat=${LOCATION_LAT}&lng=${LOCATION_LNG}&date=today`;

    log.debug("Pobieranie sunrise/sunset");

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK" && data.results) {
            const { sunrise, sunset } = data.results;
            log.debug({ sunrise, sunset }, "Dane pobrane");
            return { success: true, sunrise, sunset };
        }

        return { success: false, error: "Invalid API response" };
    } catch (err) {
        log.error({ error: err.message }, "Błąd pobierania");
        return { success: false, error: err.message };
    }
}
