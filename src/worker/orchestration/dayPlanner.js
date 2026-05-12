/**
 * Day Planner - generyczny orchestrator timerów urządzeń
 *
 * Iteruje po rejestrze urządzeń i wywołuje planDay() dla każdego z nich.
 * Logika harmonogramu każdego urządzenia należy do jego modułu w lib/.
 */

import { devices } from "../../lib/devices.js";
import {
    parseTimeToMinutes,
    getCurrentWarsawMinutes,
    formatMinutesAsTime,
} from "../../shared/utils/time.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("dayPlanner");

let cleanups = [];

/**
 * Planuje timery wszystkich urządzeń na podstawie sunrise/sunset.
 * @param {string} sunrise - czas w formacie "6:07:43 AM"
 * @param {string} sunset - czas w formacie "7:30:00 PM"
 */
export async function scheduleDayTimers(sunrise, sunset) {
    cleanups.forEach((fn) => fn());
    cleanups = [];

    const sunriseMin = parseTimeToMinutes(sunrise);
    const sunsetMin = parseTimeToMinutes(sunset);

    if (sunriseMin === null || sunsetMin === null) {
        log.warn("Brak danych sunrise/sunset - nie planuję timerów");
        return;
    }

    const nowMin = getCurrentWarsawMinutes();
    log.info({ now: formatMinutesAsTime(nowMin) }, "Planowanie dnia");

    for (const device of devices) {
        const cleanup = await device.planDay(sunriseMin, sunsetMin, nowMin);
        cleanups.push(cleanup);
    }
}

export function getTimerStatus() {
    return { activeDevices: cleanups.length };
}
