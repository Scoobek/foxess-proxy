/**
 * Sun Data Manager - zarządzanie danymi słonecznymi
 */

import { updateBojlerState } from "../../shared/state.js";
import { fetchSunriseSunset } from "../services/sunService.js";
import { scheduleDayTimers } from "../orchestration/dayPlanner.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("sunDataManager");

/**
 * Pobiera dane sunrise/sunset i aktualizuje stan
 * @returns {Promise<{success: boolean, sunrise?: string, sunset?: string, error?: string}>}
 */
export async function refreshSunData() {
    const result = await fetchSunriseSunset();

    if (result.success) {
        updateBojlerState({
            sunrise: result.sunrise,
            sunset: result.sunset,
        });
    }

    log.info({ sunrise: result.sunrise || "brak", sunset: result.sunset || "brak" }, "Okno słoneczne");

    return result;
}

/**
 * Pobiera dane sunrise/sunset i planuje timery na dzień
 * Używane przez cron i przy starcie aplikacji
 */
export async function refreshAndSchedule() {
    const result = await refreshSunData();

    if (result.success) {
        scheduleDayTimers(result.sunrise, result.sunset);
    }

    return result;
}
