/**
 * Polling Manager - generyczny menadżer interwałowego odpytywania
 */

import { createLogger } from "../../shared/logger.js";
import { POLLING_INTERVAL_MS } from "../../config/index.js";

const log = createLogger("pollingManager");

let pollingInterval = null;

/**
 * Rozpoczyna odpytywanie
 * @param {Function} pollFn - funkcja wywoływana co interwał (i natychmiast)
 * @returns {{ success: boolean, alreadyActive?: boolean }}
 */
export function startPolling(pollFn) {
    if (pollingInterval) {
        log.debug("Polling już aktywny");
        return { success: false, alreadyActive: true };
    }

    log.info("Start polling");
    pollFn();

    pollingInterval = setInterval(async () => {
        try {
            await pollFn();
        } catch (error) {
            log.error({ err: error }, "Błąd w polling interval");
        }
    }, POLLING_INTERVAL_MS);

    return { success: true };
}

/**
 * Zatrzymuje odpytywanie
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

    return { success: true };
}

export const isPollingActive = () => pollingInterval !== null;
