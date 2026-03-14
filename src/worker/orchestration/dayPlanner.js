/**
 * Day Planner - dynamiczne zarządzanie timerami w oparciu o sunrise/sunset
 *
 * Odpowiada za:
 * - Planowanie startu pullingu (sunrise + offset)
 * - Planowanie stopu pullingu (sunset)
 */

import { updateBojlerState } from "../../shared/state.js";
import {
    startPolling,
    stopPolling,
    isPollingActive,
} from "../managers/pollingManager.js";
import {
    parseTimeToMinutes,
    getCurrentWarsawMinutes,
    formatMinutesAsTime,
    msUntilMinutes,
} from "../../shared/utils/time.js";
import { SUNRISE_OFFSET_MINUTES } from "../../config/index.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("dayPlanner");

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
    log.info("W oknie aktywności - natychmiastowy start");
    updateBojlerState({ pollingStartsAt: null, pollingStopsAt });
    startPolling();

    const msToStop = msUntilMinutes(sunsetMinutes);
    stopTimer = setTimeout(() => {
        log.info("Sunset - zatrzymuję polling");
        stopPolling();
    }, msToStop);
    log.info(
        { minutesUntilStop: Math.round(msToStop / 60000) },
        "Stop timer zaplanowany"
    );
}

/**
 * Obsługuje przypadek przed oknem aktywności (przed sunrise+offset)
 */
function handleBeforeWindow(
    startMinutes,
    sunsetMinutes,
    pollingStartsAt,
    pollingStopsAt
) {
    updateBojlerState({ pollingStartsAt, pollingStopsAt });

    const msToStart = msUntilMinutes(startMinutes);
    const msToStop = msUntilMinutes(sunsetMinutes);

    startTimer = setTimeout(() => {
        log.info("Sunrise + offset - uruchamiam polling");
        startPolling();
    }, msToStart);

    stopTimer = setTimeout(() => {
        log.info("Sunset - zatrzymuję polling");
        stopPolling();
    }, msToStop);

    log.info(
        {
            minutesUntilStart: Math.round(msToStart / 60000),
            minutesUntilStop: Math.round(msToStop / 60000),
        },
        "Timery zaplanowane"
    );
}

/**
 * Obsługuje przypadek po sunset - polling nieaktywny do jutra
 */
function handleAfterSunset() {
    updateBojlerState({
        pollingStartsAt: null,
        pollingStopsAt: null,
        nextPollAt: null,
    });
    log.info("Po sunset - polling nieaktywny do jutra");
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
        log.warn("Brak danych sunrise/sunset - nie planuję timerów");
        return;
    }

    const startMinutes = sunriseMinutes + SUNRISE_OFFSET_MINUTES;
    const nowMinutes = getCurrentWarsawMinutes();

    log.info(
        {
            sunrise: formatMinutesAsTime(sunriseMinutes),
            startPolling: formatMinutesAsTime(startMinutes),
            stopPolling: formatMinutesAsTime(sunsetMinutes),
            now: formatMinutesAsTime(nowMinutes),
            offsetMinutes: SUNRISE_OFFSET_MINUTES,
        },
        "Planowanie dnia"
    );

    const pollingStartsAt = formatMinutesAsTime(startMinutes);
    const pollingStopsAt = formatMinutesAsTime(sunsetMinutes);

    if (nowMinutes >= startMinutes && nowMinutes < sunsetMinutes) {
        handleInActivityWindow(sunsetMinutes, pollingStopsAt);
    } else if (nowMinutes < startMinutes) {
        handleBeforeWindow(
            startMinutes,
            sunsetMinutes,
            pollingStartsAt,
            pollingStopsAt
        );
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
