/**
 * Współdzielony stan aplikacji
 */

import { createLogger } from "./logger.js";

const log = createLogger("state");

export const bojlerState = {
    isOn: false,
    lastChange: null,
    lastCheck: null,
    turnedOnBy: null, // 'auto' | 'manual' | null
    pvPower: 0,
    loadsPower: 0,
    surplus: 0,
    sunrise: null,
    sunset: null,
    isPolling: false,
    pollingStartsAt: null,
    pollingStopsAt: null,
    nextPollAt: null,
};

export function updateBojlerState(updates) {
    Object.assign(bojlerState, updates);
    log.debug({ keys: Object.keys(updates) }, "Aktualizacja stanu");
}
