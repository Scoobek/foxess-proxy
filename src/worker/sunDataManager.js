/**
 * Sun Data Manager - zarządzanie danymi słonecznymi
 */

import { bojlerState } from "../shared/state.js";
import { fetchSunriseSunset } from "./services/sunService.js";

/**
 * Pobiera dane sunrise/sunset i aktualizuje stan
 * @returns {Promise<{success: boolean, sunrise?: string, sunset?: string, error?: string}>}
 */
export async function refreshSunData() {
    const result = await fetchSunriseSunset();

    if (result.success) {
        bojlerState.sunrise = result.sunrise;
        bojlerState.sunset = result.sunset;
    }

    console.log(
        `Okno słoneczne: ${result.sunrise || "brak"} - ${result.sunset || "brak"}`
    );

    return result;
}
