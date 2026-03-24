/**
 * Polling Manager - zarządzanie interwałowym odpytywaniem API FoxESS
 *
 * Odpowiada za:
 * - Start/stop pollingu
 * - Obsługę błędów w interwale
 * - Aktualizację stanu pollingu
 */

import { updateDeviceState } from "../../shared/state.js";
import { refreshRealtimeData } from "./foxessDataManager.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("pollingManager");
import { calcNextPollAt } from "../../shared/utils/time.js";
import { POLLING_INTERVAL_MS } from "../../config/index.js";

let pollingInterval = null;

/**
 * Rozpoczyna odpytywanie API
 * @returns {{ success: boolean, alreadyActive?: boolean }}
 */
export function startPolling() {
    if (pollingInterval) {
        log.debug("Polling już aktywny");
        return { success: false, alreadyActive: true };
    }

    log.info("Start polling");
    updateDeviceState("bojler", {
        isPolling: true,
        pollingStartsAt: null,
        nextPollAt: calcNextPollAt(POLLING_INTERVAL_MS),
    });

    // Natychmiastowe pierwsze odpytanie
    refreshRealtimeData();

    // Interwał co 5 minut z obsługą błędów
    pollingInterval = setInterval(async () => {
        try {
            await refreshRealtimeData();
        } catch (error) {
            log.error({ err: error }, "Błąd w polling interval");
        }
        updateDeviceState("bojler", { nextPollAt: calcNextPollAt(POLLING_INTERVAL_MS) });
    }, POLLING_INTERVAL_MS);

    return { success: true };
}

/**
 * Zatrzymuje odpytywanie API
 * @returns {{ success: boolean, alreadyInactive?: boolean }}
 */
export function stopPolling() {
    if (!pollingInterval) {
        log.debug("Polling już nieaktywny");
        return { success: false, alreadyInactive: true };
    }

    log.info("Stop polling");
    clearInterval(pollingInterval);
    pollingInterval = null;
    updateDeviceState("bojler", {
        isPolling: false,
        pollingStopsAt: null,
        nextPollAt: null,
    });

    return { success: true };
}

/**
 * Sprawdza czy polling jest aktywny
 * @returns {boolean}
 */
export function isPollingActive() {
    return pollingInterval !== null;
}
