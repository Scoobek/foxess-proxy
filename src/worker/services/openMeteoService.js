/**
 * Open-Meteo Service - pobieranie danych pogodowych
 */

import { LOCATION_LAT, LOCATION_LNG } from "../../config/index.js";
import {
    OPEN_METEO_API,
    OPEN_METEO_CURRENT,
    OPEN_METEO_HOURLY,
} from "../../config/openmeteo.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("openMeteoService");

export async function fetchWeather() {
    const params = new URLSearchParams({
        latitude: LOCATION_LAT,
        longitude: LOCATION_LNG,
        forecast_days: "1",
        timezone: process.env.TZ,
        current: OPEN_METEO_CURRENT.join(","),
        hourly: OPEN_METEO_HOURLY.join(","),
    });
    const url = `${OPEN_METEO_API}?${params}`;

    log.debug("Pobieranie danych pogodowych");

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.current && data.hourly) {
            log.debug({ current: data.current }, "Dane pobrane");
            return {
                success: true,
                current: data.current,
                hourly: data.hourly,
            };
        }

        return { success: false, error: "Invalid API response" };
    } catch (err) {
        log.error({ error: err.message }, "Błąd pobierania");
        return { success: false, error: err.message };
    }
}
