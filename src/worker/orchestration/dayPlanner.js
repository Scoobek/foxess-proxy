/**
 * Day Planner - dynamiczne zarządzanie timerami w oparciu o sunrise/sunset
 *
 * Odpowiada za:
 * - Planowanie startu/stopu pollingu bojlera (sunrise + offset → sunset)
 * - Planowanie włączenia/wyłączenia lampek (sunset + offset → sunrise - offset)
 */

import { updateDeviceState } from "../../shared/state.js";
import { ensureBojlerOff } from "../../lib/bojler.js";
import { ensureLampkiOn, ensureLampkiOff } from "../../lib/podswietlenieDomu.js";
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
import {
    SUNRISE_OFFSET_MINUTES,
    LAMPKI_SUNSET_OFFSET_MINUTES,
    LAMPKI_SUNRISE_OFFSET_MINUTES,
} from "../../config/index.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("dayPlanner");

// Stan timerów - bojler
let bojlerStartTimer = null;
let bojlerStopTimer = null;

// Stan timerów - lampki
let lampkiOnTimer = null;
let lampkiOffTimer = null;

/**
 * Czyści wszystkie zaplanowane timery
 */
function clearAllTimers() {
    // Bojler
    if (bojlerStartTimer) {
        clearTimeout(bojlerStartTimer);
        bojlerStartTimer = null;
    }
    if (bojlerStopTimer) {
        clearTimeout(bojlerStopTimer);
        bojlerStopTimer = null;
    }
    stopPolling();

    // Lampki
    if (lampkiOnTimer) {
        clearTimeout(lampkiOnTimer);
        lampkiOnTimer = null;
    }
    if (lampkiOffTimer) {
        clearTimeout(lampkiOffTimer);
        lampkiOffTimer = null;
    }
}

// ==================== BOJLER ====================

/**
 * Obsługuje przypadek gdy jesteśmy w oknie aktywności bojlera (między sunrise+offset a sunset)
 */
function handleBojlerInActivityWindow(sunsetMinutes, pollingStopsAt) {
    log.info("[bojler] W oknie aktywności - natychmiastowy start");
    updateDeviceState("bojler", { pollingStartsAt: null, pollingStopsAt });
    startPolling();

    const msToStop = msUntilMinutes(sunsetMinutes);
    bojlerStopTimer = setTimeout(() => {
        log.info("[bojler] Sunset - zatrzymuję polling");
        stopPolling();
    }, msToStop);
    log.info(
        { minutesUntilStop: Math.round(msToStop / 60000) },
        "[bojler] Stop timer zaplanowany"
    );
}

/**
 * Obsługuje przypadek przed oknem aktywności bojlera (przed sunrise+offset)
 */
function handleBojlerBeforeWindow(
    startMinutes,
    sunsetMinutes,
    pollingStartsAt,
    pollingStopsAt
) {
    updateDeviceState("bojler", { pollingStartsAt, pollingStopsAt });

    const msToStart = msUntilMinutes(startMinutes);
    const msToStop = msUntilMinutes(sunsetMinutes);

    bojlerStartTimer = setTimeout(() => {
        log.info("[bojler] Sunrise + offset - uruchamiam polling");
        startPolling();
    }, msToStart);

    bojlerStopTimer = setTimeout(() => {
        log.info("[bojler] Sunset - zatrzymuję polling");
        stopPolling();
    }, msToStop);

    log.info(
        {
            minutesUntilStart: Math.round(msToStart / 60000),
            minutesUntilStop: Math.round(msToStop / 60000),
        },
        "[bojler] Timery zaplanowane"
    );
}

/**
 * Obsługuje przypadek po sunset - polling nieaktywny do jutra
 */
async function handleBojlerAfterSunset() {
    updateDeviceState("bojler", {
        pollingStartsAt: null,
        pollingStopsAt: null,
        nextPollAt: null,
    });

    await ensureBojlerOff("sunset");
    log.info("[bojler] Po sunset - polling nieaktywny do jutra");
}

/**
 * Planuje timery bojlera
 */
async function scheduleBojlerTimers(sunriseMinutes, sunsetMinutes, nowMinutes) {
    const startMinutes = sunriseMinutes + SUNRISE_OFFSET_MINUTES;

    log.info(
        {
            sunrise: formatMinutesAsTime(sunriseMinutes),
            startPolling: formatMinutesAsTime(startMinutes),
            stopPolling: formatMinutesAsTime(sunsetMinutes),
            offsetMinutes: SUNRISE_OFFSET_MINUTES,
        },
        "[bojler] Planowanie"
    );

    const pollingStartsAt = formatMinutesAsTime(startMinutes);
    const pollingStopsAt = formatMinutesAsTime(sunsetMinutes);

    if (nowMinutes >= startMinutes && nowMinutes < sunsetMinutes) {
        handleBojlerInActivityWindow(sunsetMinutes, pollingStopsAt);
    } else if (nowMinutes < startMinutes) {
        handleBojlerBeforeWindow(
            startMinutes,
            sunsetMinutes,
            pollingStartsAt,
            pollingStopsAt
        );
    } else {
        await handleBojlerAfterSunset();
    }
}

// ==================== LAMPKI ====================

/**
 * Planuje timery lampek
 * Lampki działają w nocy: włączenie po sunset+offset, wyłączenie przed sunrise-offset
 */
async function scheduleLampkiTimers(sunriseMinutes, sunsetMinutes, nowMinutes) {
    const lampkiOnMinutes = sunsetMinutes + LAMPKI_SUNSET_OFFSET_MINUTES;
    const lampkiOffMinutes = sunriseMinutes - LAMPKI_SUNRISE_OFFSET_MINUTES;

    log.info(
        {
            lampkiOn: formatMinutesAsTime(lampkiOnMinutes),
            lampkiOff: formatMinutesAsTime(lampkiOffMinutes),
            sunsetOffset: LAMPKI_SUNSET_OFFSET_MINUTES,
            sunriseOffset: LAMPKI_SUNRISE_OFFSET_MINUTES,
        },
        "[lampki] Planowanie"
    );

    // Scenariusze:
    // 1. Przed lampkiOffMinutes (rano) - jesteśmy w nocy, lampki powinny być ON
    // 2. Po lampkiOffMinutes i przed lampkiOnMinutes - dzień, lampki OFF
    // 3. Po lampkiOnMinutes - noc, lampki ON

    if (nowMinutes < lampkiOffMinutes) {
        // Jesteśmy przed czasem wyłączenia (wczesny ranek) - lampki powinny być ON
        log.info("[lampki] Przed sunrise-offset - lampki powinny być włączone");
        await ensureLampkiOn("auto");

        // Zaplanuj wyłączenie
        const msToOff = msUntilMinutes(lampkiOffMinutes);
        lampkiOffTimer = setTimeout(async () => {
            log.info("[lampki] Sunrise - offset - wyłączam lampki");
            await ensureLampkiOff("sunrise");
        }, msToOff);

        // Zaplanuj włączenie wieczorem
        const msToOn = msUntilMinutes(lampkiOnMinutes);
        lampkiOnTimer = setTimeout(async () => {
            log.info("[lampki] Sunset + offset - włączam lampki");
            await ensureLampkiOn("auto");
        }, msToOn);

        log.info(
            {
                minutesUntilOff: Math.round(msToOff / 60000),
                minutesUntilOn: Math.round(msToOn / 60000),
            },
            "[lampki] Timery zaplanowane"
        );
    } else if (nowMinutes >= lampkiOffMinutes && nowMinutes < lampkiOnMinutes) {
        // Dzień - lampki powinny być OFF
        log.info("[lampki] Dzień - lampki powinny być wyłączone");
        await ensureLampkiOff("auto");

        // Zaplanuj włączenie wieczorem
        const msToOn = msUntilMinutes(lampkiOnMinutes);
        lampkiOnTimer = setTimeout(async () => {
            log.info("[lampki] Sunset + offset - włączam lampki");
            await ensureLampkiOn("auto");
        }, msToOn);

        log.info(
            { minutesUntilOn: Math.round(msToOn / 60000) },
            "[lampki] Timer ON zaplanowany"
        );
    } else {
        // Po sunset+offset - noc, lampki ON (wyłączenie jutro)
        log.info("[lampki] Po sunset+offset - lampki powinny być włączone");
        await ensureLampkiOn("auto");
        log.info("[lampki] Wyłączenie zaplanowane na jutro (przy refresh)");
    }
}

// ==================== GŁÓWNA FUNKCJA ====================

/**
 * Planuje timery na podstawie sunrise/sunset
 * @param {string} sunrise - czas sunrise w formacie "6:07:43 AM"
 * @param {string} sunset - czas sunset w formacie "7:30:00 PM"
 */
export async function scheduleDayTimers(sunrise, sunset) {
    clearAllTimers();

    const sunriseMinutes = parseTimeToMinutes(sunrise);
    const sunsetMinutes = parseTimeToMinutes(sunset);

    if (sunriseMinutes === null || sunsetMinutes === null) {
        log.warn("Brak danych sunrise/sunset - nie planuję timerów");
        return;
    }

    const nowMinutes = getCurrentWarsawMinutes();
    log.info({ now: formatMinutesAsTime(nowMinutes) }, "Planowanie dnia");

    // Planuj timery dla obu urządzeń
    await scheduleBojlerTimers(sunriseMinutes, sunsetMinutes, nowMinutes);
    await scheduleLampkiTimers(sunriseMinutes, sunsetMinutes, nowMinutes);
}

/**
 * Zwraca aktualny stan timerów (do debugowania)
 */
export function getTimerStatus() {
    return {
        bojler: {
            isPolling: isPollingActive(),
            hasStartTimer: bojlerStartTimer !== null,
            hasStopTimer: bojlerStopTimer !== null,
        },
        lampki: {
            hasOnTimer: lampkiOnTimer !== null,
            hasOffTimer: lampkiOffTimer !== null,
        },
    };
}
