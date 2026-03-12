/**
 * Day Planner - dynamiczne zarządzanie timerami w oparciu o sunrise/sunset
 *
 * Odpowiada za:
 * - Planowanie startu pullingu (sunrise + offset)
 * - Planowanie stopu pullingu (sunset)
 * - Interwałowe odpytywanie API FoxESS
 */

import { updateBojlerState } from "../../shared/state.js";
import { refreshRealtimeData } from "../managers/foxessDataManager.js";
import {
    parseTimeToMinutes,
    getCurrentWarsawMinutes,
    formatMinutesAsTime,
    msUntilMinutes,
} from "../../shared/utils/time.js";
import { SUNRISE_OFFSET_MINUTES, POLLING_INTERVAL_MS } from "../../config/index.js";

// Stan timerów
let startTimer = null;
let stopTimer = null;
let pollingInterval = null;

/**
 * Oblicza czas następnego poll jako ISO string
 */
function calcNextPollAt() {
    return new Date(Date.now() + POLLING_INTERVAL_MS).toISOString();
}

/**
 * Rozpoczyna odpytywanie API
 */
export function startPolling() {
    if (pollingInterval) {
        console.log("[dayPlanner] Polling już aktywny");
        return;
    }

    console.log("[dayPlanner] 🟢 Start polling");
    updateBojlerState({
        isPolling: true,
        pollingStartsAt: null,
        nextPollAt: calcNextPollAt(),
    });

    // Natychmiastowe pierwsze odpytanie
    refreshRealtimeData();

    // Interwał co 5 minut
    pollingInterval = setInterval(() => {
        refreshRealtimeData();
        updateBojlerState({ nextPollAt: calcNextPollAt() });
    }, POLLING_INTERVAL_MS);
}

/**
 * Zatrzymuje odpytywanie API
 */
export function stopPolling() {
    if (!pollingInterval) {
        console.log("[dayPlanner] Polling już nieaktywny");
        return;
    }

    console.log("[dayPlanner] 🔴 Stop polling");
    clearInterval(pollingInterval);
    pollingInterval = null;
    updateBojlerState({
        isPolling: false,
        pollingStopsAt: null,
        nextPollAt: null,
    });
}

/**
 * Czyści wszystkie zaplanowane timery
 */
export function clearAllTimers() {
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
 * Planuje timery na podstawie sunrise/sunset
 * @param {string} sunrise - czas sunrise w formacie "6:07:43 AM"
 * @param {string} sunset - czas sunset w formacie "7:30:00 PM"
 */
export function scheduleDayTimers(sunrise, sunset) {
    // Wyczyść poprzednie timery
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

    // Sprawdź czy jesteśmy w oknie aktywności
    if (nowMinutes >= startMinutes && nowMinutes < sunsetMinutes) {
        // Już w oknie - od razu start
        console.log("[dayPlanner] W oknie aktywności - natychmiastowy start");
        updateBojlerState({ pollingStartsAt: null, pollingStopsAt });
        startPolling();

        // Zaplanuj stop na sunset
        const msToStop = msUntilMinutes(sunsetMinutes);
        stopTimer = setTimeout(() => {
            console.log("[dayPlanner] Sunset - zatrzymuję polling");
            stopPolling();
        }, msToStop);
        console.log(`[dayPlanner] Stop timer za ${Math.round(msToStop / 60000)} minut`);

    } else if (nowMinutes < startMinutes) {
        // Przed oknem - zaplanuj start i stop
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

    } else {
        // Po sunset - nic nie robimy do jutra
        updateBojlerState({ pollingStartsAt: null, pollingStopsAt: null, nextPollAt: null });
        console.log("[dayPlanner] Po sunset - polling nieaktywny do jutra");
    }
}

/**
 * Zwraca aktualny stan timerów (do debugowania)
 */
export function getTimerStatus() {
    return {
        isPolling: pollingInterval !== null,
        hasStartTimer: startTimer !== null,
        hasStopTimer: stopTimer !== null,
    };
}
