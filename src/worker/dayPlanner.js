/**
 * Day Planner - dynamiczne zarządzanie timerami w oparciu o sunrise/sunset
 *
 * Odpowiada za:
 * - Planowanie startu pullingu (sunrise + offset)
 * - Planowanie stopu pullingu (sunset)
 * - Interwałowe odpytywanie API FoxESS
 */

import { bojlerState, updateBojlerState } from "../shared/state.js";
import { refreshRealtimeData } from "./foxessDataManager.js";
import { parseTimeToMinutes, getCurrentWarsawMinutes } from "../shared/utils/time.js";
import { SUNRISE_OFFSET_MINUTES } from "../config/index.js";

// Interwał odpytywania API (5 minut)
const POLLING_INTERVAL_MS = 5 * 60 * 1000;

// Stan timerów
let startTimer = null;
let stopTimer = null;
let pollingInterval = null;

/**
 * Oblicza milisekundy do podanego czasu (w minutach od północy)
 * @param {number} targetMinutes - docelowy czas w minutach od północy
 * @returns {number} milisekundy do celu (lub 0 jeśli już minął)
 */
function msUntil(targetMinutes) {
    const nowMinutes = getCurrentWarsawMinutes();
    const diffMinutes = targetMinutes - nowMinutes;

    if (diffMinutes <= 0) return 0;
    return diffMinutes * 60 * 1000;
}

/**
 * Formatuje minuty jako HH:MM
 */
function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
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
    updateBojlerState({ isPolling: true });

    // Natychmiastowe pierwsze odpytanie
    refreshRealtimeData();

    // Interwał co 5 minut
    pollingInterval = setInterval(() => {
        refreshRealtimeData();
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
    updateBojlerState({ isPolling: false });
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
    console.log(`  Sunrise: ${formatTime(sunriseMinutes)}`);
    console.log(`  Start polling: ${formatTime(startMinutes)} (sunrise + ${SUNRISE_OFFSET_MINUTES}min)`);
    console.log(`  Stop polling: ${formatTime(sunsetMinutes)} (sunset)`);
    console.log(`  Teraz: ${formatTime(nowMinutes)}`);

    // Sprawdź czy jesteśmy w oknie aktywności
    if (nowMinutes >= startMinutes && nowMinutes < sunsetMinutes) {
        // Już w oknie - od razu start
        console.log("[dayPlanner] W oknie aktywności - natychmiastowy start");
        startPolling();

        // Zaplanuj stop na sunset
        const msToStop = msUntil(sunsetMinutes);
        stopTimer = setTimeout(() => {
            console.log("[dayPlanner] Sunset - zatrzymuję polling");
            stopPolling();
        }, msToStop);
        console.log(`[dayPlanner] Stop timer za ${Math.round(msToStop / 60000)} minut`);

    } else if (nowMinutes < startMinutes) {
        // Przed oknem - zaplanuj start i stop
        const msToStart = msUntil(startMinutes);
        const msToStop = msUntil(sunsetMinutes);

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
