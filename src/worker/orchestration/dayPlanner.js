/**
 * Day Planner - dynamiczne zarządzanie timerami w oparciu o sunrise/sunset
 *
 * Odpowiada za:
 * - Planowanie startu pullingu (sunrise + offset)
 * - Planowanie stopu pullingu (sunset)
 */

import { updateBojlerState } from "../../shared/state.js";
import { startPolling, stopPolling, isPollingActive } from "../managers/pollingManager.js";
import {
    parseTimeToMinutes,
    getCurrentWarsawMinutes,
    formatMinutesAsTime,
    msUntilMinutes,
} from "../../shared/utils/time.js";
import { SUNRISE_OFFSET_MINUTES } from "../../config/index.js";

// Stan timerów planowania
let startTimer = null;
let stopTimer = null;

/**
 * Czyści wszystkie zaplanowane timery
 */
function clearAllTimers() {
    if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
    }
    if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
    }
    stopPolling();
}

/**
 * Obsługuje przypadek gdy jesteśmy w oknie aktywności (między sunrise+offset a sunset)
 */
function handleInActivityWindow(sunsetMinutes, pollingStopsAt) {
    console.log("[dayPlanner] W oknie aktywności - natychmiastowy start");
    updateBojlerState({ pollingStartsAt: null, pollingStopsAt });
    startPolling();

    const msToStop = msUntilMinutes(sunsetMinutes);
    stopTimer = setTimeout(() => {
        console.log("[dayPlanner] Sunset - zatrzymuję polling");
        stopPolling();
    }, msToStop);
    console.log(`[dayPlanner] Stop timer za ${Math.round(msToStop / 60000)} minut`);
}

/**
 * Obsługuje przypadek przed oknem aktywności (przed sunrise+offset)
 */
function handleBeforeWindow(startMinutes, sunsetMinutes, pollingStartsAt, pollingStopsAt) {
    updateBojlerState({ pollingStartsAt, pollingStopsAt });

    const msToStart = msUntilMinutes(startMinutes);
    const msToStop = msUntilMinutes(sunsetMinutes);

    startTimer = setTimeout(() => {
        console.log("[dayPlanner] Sunrise + offset - uruchamiam polling");
        startPolling();
    }, msToStart);

    stopTimer = setTimeout(() => {
        console.log("[dayPlanner] Sunset - zatrzymuję polling");
        stopPolling();
    }, msToStop);

    console.log(`[dayPlanner] Start timer za ${Math.round(msToStart / 60000)} minut`);
    console.log(`[dayPlanner] Stop timer za ${Math.round(msToStop / 60000)} minut`);
}

/**
 * Obsługuje przypadek po sunset - polling nieaktywny do jutra
 */
function handleAfterSunset() {
    updateBojlerState({ pollingStartsAt: null, pollingStopsAt: null, nextPollAt: null });
    console.log("[dayPlanner] Po sunset - polling nieaktywny do jutra");
}

/**
 * Planuje timery na podstawie sunrise/sunset
 * @param {string} sunrise - czas sunrise w formacie "6:07:43 AM"
 * @param {string} sunset - czas sunset w formacie "7:30:00 PM"
 */
export function scheduleDayTimers(sunrise, sunset) {
    clearAllTimers();

    const sunriseMinutes = parseTimeToMinutes(sunrise);
    const sunsetMinutes = parseTimeToMinutes(sunset);

    if (sunriseMinutes === null || sunsetMinutes === null) {
        console.log("[dayPlanner] Brak danych sunrise/sunset - nie planuję timerów");
        return;
    }

    const startMinutes = sunriseMinutes + SUNRISE_OFFSET_MINUTES;
    const nowMinutes = getCurrentWarsawMinutes();

    console.log(`[dayPlanner] Planowanie dnia:`);
    console.log(`  Sunrise: ${formatMinutesAsTime(sunriseMinutes)}`);
    console.log(`  Start polling: ${formatMinutesAsTime(startMinutes)} (sunrise + ${SUNRISE_OFFSET_MINUTES}min)`);
    console.log(`  Stop polling: ${formatMinutesAsTime(sunsetMinutes)} (sunset)`);
    console.log(`  Teraz: ${formatMinutesAsTime(nowMinutes)}`);

    const pollingStartsAt = formatMinutesAsTime(startMinutes);
    const pollingStopsAt = formatMinutesAsTime(sunsetMinutes);

    if (nowMinutes >= startMinutes && nowMinutes < sunsetMinutes) {
        handleInActivityWindow(sunsetMinutes, pollingStopsAt);
    } else if (nowMinutes < startMinutes) {
        handleBeforeWindow(startMinutes, sunsetMinutes, pollingStartsAt, pollingStopsAt);
    } else {
        handleAfterSunset();
    }
}

/**
 * Zwraca aktualny stan timerów (do debugowania)
 */
export function getTimerStatus() {
    return {
        isPolling: isPollingActive(),
        hasStartTimer: startTimer !== null,
        hasStopTimer: stopTimer !== null,
    };
}
