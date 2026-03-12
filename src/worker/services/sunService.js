/**
 * Sunrise/Sunset Service - pobieranie czasów wschodu i zachodu słońca
 */

import {
    LOCATION_LAT,
    LOCATION_LNG,
    SUNRISE_SUNSET_API,
} from "../../config/sunrisesunset.js";

export async function fetchSunriseSunset() {
    const url = `${SUNRISE_SUNSET_API}?lat=${LOCATION_LAT}&lng=${LOCATION_LNG}&date=today`;

    console.log(`[sunService] → ${url}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK" && data.results) {
            const { sunrise, sunset } = data.results;
            console.log(`[sunService] sunrise: ${sunrise}, sunset: ${sunset}`);
            return { success: true, sunrise, sunset };
        }

        return { success: false, error: "Invalid API response" };
    } catch (err) {
        console.error("[sunService] Błąd:", err.message);
        return { success: false, error: err.message };
    }
}
